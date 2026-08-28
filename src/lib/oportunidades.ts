import "server-only";

import {
  readOpportunityDashboardSnapshot,
  rebuildAllAnalyticsTotals,
} from "./analytics-totals";
import { getMongoConnection } from "./mongodb";
import {
  ensureOwnerClassifications,
  getOpportunityOwnerClassifications,
} from "./propietarios-clasificacion";
import { synchronizeOpportunitySellerMappings } from "./asociaciones";
import { parseOpportunityCsv } from "./oportunidades/csv";
import { parseOpportunityCollaboratorCsv } from "./oportunidades/colaboradores";
import { AsociacionPropietarioVendedor } from "../models/asociacion-propietario-vendedor";
import { ImportacionOportunidades } from "../models/importacion-oportunidades";
import { Oportunidad } from "../models/oportunidad";
import { getOriginSuboriginNames, normalizeOrigin } from "./suborigenes";
import { type OpportunityDashboard } from "./dashboard-contract";
import { type OpportunityOwnerGroup } from "./propietario-clasificacion-contract";

export { CsvValidationError } from "./oportunidades/csv";

export type ImportResult = {
  importacionId: string;
  archivo: string;
  procesados: number;
  creados: number;
  actualizados: number;
  propietariosPendientes: number;
  importadoEn: string;
};

export type CollaboratorImportResult = {
  archivo: string;
  procesados: number;
  encontrados: number;
  actualizados: number;
  ignorados: number;
  importadoEn: string;
};

export type OpportunityOwner = {
  nombre: string;
  clave: string;
  oportunidades: number;
  vendedorCodigo: number | null;
  grupo: OpportunityOwnerGroup;
};

export type OpportunitySummary = {
  total: number;
  presupuestoSincronizado: number;
  pendientesAsociacion: number;
  origenesSinSuborigen: number;
  etapas: Array<{ nombre: string; total: number }>;
  ultimaImportacion: ImportResult | null;
  recientes: Array<{
    oportunidadId: string;
    nombre: string | null;
    propietarioNombre: string;
    etapa: string | null;
    fechaCreacion: string | null;
    fechaCierre: string | null;
    presupuestoSincronizado: boolean;
    vendedorCodigo: number | null;
    origen: string | null;
    suborigenNombre: string | null;
  }>;
};

async function prepareMongoModels() {
  await getMongoConnection();
  await Promise.all([
    Oportunidad.init(),
    AsociacionPropietarioVendedor.init(),
    ImportacionOportunidades.init(),
  ]);
}

export async function importOpportunities(
  buffer: Buffer,
  fileName: string,
): Promise<ImportResult> {
  const rows = parseOpportunityCsv(buffer);
  await prepareMongoModels();

  const ownerKeys = [...new Set(rows.map((row) => row.propietarioClave))];
  const opportunityIds = rows.map((row) => row.oportunidadId);
  const [mappings, existing, originSuborigins] = await Promise.all([
    AsociacionPropietarioVendedor.find({
      propietarioClave: { $in: ownerKeys },
    })
      .select({ propietarioClave: 1, vendedorCodigo: 1, _id: 0 })
      .lean(),
    Oportunidad.find({ oportunidadId: { $in: opportunityIds } })
      .select({ oportunidadId: 1, _id: 0 })
      .lean(),
    getOriginSuboriginNames(rows.map((row) => row.origen)),
  ]);

  const sellersByOwner = new Map(
    mappings.map((mapping) => [mapping.propietarioClave, mapping.vendedorCodigo]),
  );
  const existingIds = new Set(existing.map((item) => item.oportunidadId));
  const importedAt = new Date();

  await ensureOwnerClassifications(
    rows.map((row) => ({
      propietarioClave: row.propietarioClave,
      propietarioNombre: row.propietarioNombre,
    })),
  );

  if (rows.length > 0) {
    await Oportunidad.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { oportunidadId: row.oportunidadId },
          update: {
            $set: {
              ...row,
              origenNormalizado: row.origen ? normalizeOrigin(row.origen) : null,
              suborigenNombre: row.origen
                ? (originSuborigins.get(normalizeOrigin(row.origen)) ?? null)
                : null,
              vendedorCodigo: sellersByOwner.get(row.propietarioClave) ?? null,
              ultimaImportacionEn: importedAt,
            },
          },
          upsert: true,
        },
      })),
      { ordered: true },
    );
  }

  const created = rows.filter((row) => !existingIds.has(row.oportunidadId)).length;
  const pendingOwners = ownerKeys.filter((key) => !sellersByOwner.has(key)).length;
  const importRecord = await ImportacionOportunidades.create({
    archivo: fileName.slice(0, 255),
    procesados: rows.length,
    creados: created,
    actualizados: rows.length - created,
    propietariosPendientes: pendingOwners,
  });

  await rebuildAllAnalyticsTotals();

  return {
    importacionId: String(importRecord._id),
    archivo: importRecord.archivo,
    procesados: importRecord.procesados,
    creados: importRecord.creados,
    actualizados: importRecord.actualizados,
    propietariosPendientes: importRecord.propietariosPendientes,
    importadoEn: importRecord.createdAt.toISOString(),
  };
}

export async function importOpportunityCollaborators(
  buffer: Buffer,
  fileName: string,
): Promise<CollaboratorImportResult> {
  const rows = parseOpportunityCollaboratorCsv(buffer);
  await prepareMongoModels();

  const importedAt = new Date();
  const importedIds = rows.map((row) => row.oportunidadId);
  const existing = await Oportunidad.find({ oportunidadId: { $in: importedIds } })
    .select({ oportunidadId: 1, colaborador: 1, _id: 0 })
    .lean();

  const existingById = new Map(
    existing.map((item) => [item.oportunidadId, item.colaborador ?? null]),
  );
  const knownIds = new Set(existing.map((item) => item.oportunidadId));
  const operations: Parameters<typeof Oportunidad.bulkWrite>[0] = [];
  let actualizados = 0;

  for (const row of rows) {
    if (!knownIds.has(row.oportunidadId)) {
      continue;
    }

    if (existingById.get(row.oportunidadId) !== row.colaborador) {
      actualizados += 1;
    }

    operations.push({
      updateOne: {
        filter: { oportunidadId: row.oportunidadId },
        update: {
          $set: {
            colaborador: row.colaborador,
            ultimaImportacionEn: importedAt,
          },
        },
      },
    });
  }

  const absentKnownIds = await Oportunidad.find({
    oportunidadId: { $nin: importedIds },
    colaborador: { $ne: false },
  })
    .select({ oportunidadId: 1, _id: 0 })
    .lean();

  actualizados += absentKnownIds.length;

  if (absentKnownIds.length > 0) {
    operations.push({
      updateMany: {
        filter: { oportunidadId: { $in: absentKnownIds.map((item) => item.oportunidadId) } },
        update: {
          $set: {
            colaborador: false,
            ultimaImportacionEn: importedAt,
          },
        },
      },
    });
  }

  if (operations.length > 0) {
    await Oportunidad.bulkWrite(operations, { ordered: true });
  }

  await rebuildAllAnalyticsTotals();

  return {
    archivo: fileName.slice(0, 255),
    procesados: rows.length,
    encontrados: existing.length,
    actualizados,
    ignorados: rows.length - existing.length,
    importadoEn: importedAt.toISOString(),
  };
}

export async function getOpportunityOwners(): Promise<OpportunityOwner[]> {
  return getOpportunityOwnerClassifications();
}

export async function getOpportunitySummary(): Promise<OpportunitySummary> {
  await prepareMongoModels();
  await synchronizeOpportunitySellerMappings();

  const [total, budget, pending, mappedOrigins, stages, lastImport, recent] = await Promise.all([
    Oportunidad.countDocuments(),
    Oportunidad.countDocuments({ presupuestoSincronizado: true }),
    Oportunidad.countDocuments({ vendedorCodigo: null }),
    Oportunidad.distinct("origenNormalizado", {
      origenNormalizado: { $type: "string", $ne: "" },
    }),
    Oportunidad.aggregate<{ _id: string | null; total: number }>([
      { $group: { _id: "$etapa", total: { $sum: 1 } } },
      { $sort: { total: -1, _id: 1 } },
    ]),
    ImportacionOportunidades.findOne({}).sort({ createdAt: -1 }).lean(),
    Oportunidad.find({})
      .sort({ fechaCreacion: -1, oportunidadId: 1 })
      .limit(10)
      .lean(),
  ]);
  const [mappedSuboriginNames, recentSuboriginNames] = await Promise.all([
    getOriginSuboriginNames(mappedOrigins),
    getOriginSuboriginNames(recent.map((item) => item.origen ?? null)),
  ]);
  const pendingOrigins = mappedOrigins.filter((origin) => !mappedSuboriginNames.has(origin)).length;

  return {
    total,
    presupuestoSincronizado: budget,
    pendientesAsociacion: pending,
    origenesSinSuborigen: pendingOrigins,
    etapas: stages.map((stage) => ({
      nombre: stage._id ?? "Sin etapa",
      total: stage.total,
    })),
    ultimaImportacion: lastImport
      ? {
          importacionId: String(lastImport._id),
          archivo: lastImport.archivo,
          procesados: lastImport.procesados,
          creados: lastImport.creados,
          actualizados: lastImport.actualizados,
          propietariosPendientes: lastImport.propietariosPendientes,
          importadoEn: lastImport.createdAt.toISOString(),
        }
      : null,
    recientes: recent.map((item) => ({
      oportunidadId: item.oportunidadId,
      nombre: item.nombre,
      propietarioNombre: item.propietarioNombre,
      etapa: item.etapa,
      fechaCreacion: item.fechaCreacion?.toISOString() ?? null,
      fechaCierre: item.fechaCierre?.toISOString() ?? null,
      presupuestoSincronizado: item.presupuestoSincronizado,
      vendedorCodigo: item.vendedorCodigo ?? null,
      origen: item.origen ?? null,
      suborigenNombre:
        item.origen ? (recentSuboriginNames.get(normalizeOrigin(item.origen)) ?? null) : null,
    })),
  };
}

export async function getOpportunityDashboard(
  requestedPeriod?: string | null,
): Promise<OpportunityDashboard> {
  return readOpportunityDashboardSnapshot(requestedPeriod);
}
