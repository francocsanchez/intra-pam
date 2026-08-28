import "server-only";

import { rebuildAllAnalyticsTotals } from "./analytics-totals";
import { getMongoConnection } from "@/lib/mongodb";
import { normalizeOwner } from "@/lib/oportunidades/csv";
import { getSqlConnection } from "@/lib/sqlserver";
import { AsociacionPropietarioVendedor } from "@/models/asociacion-propietario-vendedor";
import { Oportunidad } from "@/models/oportunidad";

export class AssociationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssociationConflictError";
  }
}

export class AssociationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssociationValidationError";
  }
}

async function prepareAssociationModels() {
  await getMongoConnection();
  await Promise.all([Oportunidad.init(), AsociacionPropietarioVendedor.init()]);
}

async function assertActiveSeller(sellerCode: number) {
  const pool = await getSqlConnection();
  const result = await pool
    .request()
    .input("sellerCode", sellerCode)
    .query<{ codigo: number }>(`
      SELECT TOP (1) ven_codigo AS codigo
      FROM dbo.vendedor
      WHERE ven_codigo = @sellerCode AND ven_estado = 1
    `);

  if (!result.recordset[0]) {
    throw new AssociationValidationError(
      "El vendedor no existe o no se encuentra activo.",
    );
  }
}

export async function getSellerOwnerMappings(sellerCodes: number[]) {
  if (sellerCodes.length === 0) {
    return new Map<number, string>();
  }

  await prepareAssociationModels();
  const mappings = await AsociacionPropietarioVendedor.find({
    vendedorCodigo: { $in: sellerCodes },
  })
    .select({ vendedorCodigo: 1, propietarioNombre: 1, _id: 0 })
    .lean();

  return new Map<number, string>(
    mappings.map((mapping) => [mapping.vendedorCodigo, mapping.propietarioNombre]),
  );
}

export async function synchronizeOpportunitySellerMappings() {
  await prepareAssociationModels();
  const mappings = await AsociacionPropietarioVendedor.find({})
    .select({ propietarioClave: 1, vendedorCodigo: 1, _id: 0 })
    .lean();

  if (mappings.length === 0) {
    return 0;
  }

  const result = await Oportunidad.bulkWrite(
    mappings.map((mapping) => ({
      updateMany: {
        filter: {
          propietarioClave: mapping.propietarioClave,
          vendedorCodigo: { $ne: mapping.vendedorCodigo },
        },
        update: { $set: { vendedorCodigo: mapping.vendedorCodigo } },
      },
    })),
    { ordered: false },
  );

  return result.modifiedCount;
}

export async function setSellerOwnerMapping(
  sellerCode: number,
  ownerName: string | null,
  replaceExisting = false,
) {
  if (!Number.isInteger(sellerCode) || sellerCode <= 0) {
    throw new AssociationValidationError("El codigo de vendedor no es valido.");
  }

  await assertActiveSeller(sellerCode);
  await prepareAssociationModels();

  if (ownerName === null) {
    const removed = await AsociacionPropietarioVendedor.findOneAndDelete({
      vendedorCodigo: sellerCode,
    }).lean();

    if (!removed) {
      return { propietario: null, oportunidadesActualizadas: 0 };
    }

    const update = await Oportunidad.updateMany(
      { propietarioClave: removed.propietarioClave },
      { $set: { vendedorCodigo: null } },
    );

    await rebuildAllAnalyticsTotals();

    return {
      propietario: null,
      oportunidadesActualizadas: update.modifiedCount,
    };
  }

  const normalizedName = ownerName.trim().replace(/\s+/g, " ");
  const ownerKey = normalizeOwner(normalizedName);

  if (!ownerKey) {
    throw new AssociationValidationError("El propietario no es valido.");
  }

  const [opportunityOwner, ownerMapping, sellerMapping] = await Promise.all([
    Oportunidad.findOne({ propietarioClave: ownerKey })
      .select({ propietarioNombre: 1, _id: 0 })
      .lean(),
    AsociacionPropietarioVendedor.findOne({ propietarioClave: ownerKey }).lean(),
    AsociacionPropietarioVendedor.findOne({ vendedorCodigo: sellerCode }).lean(),
  ]);

  if (!opportunityOwner) {
    throw new AssociationValidationError(
      "El propietario no existe entre las oportunidades importadas.",
    );
  }

  if (
    ownerMapping?.vendedorCodigo === sellerCode &&
    sellerMapping?.propietarioClave === ownerKey
  ) {
    const update = await Oportunidad.updateMany(
      { propietarioClave: ownerKey, vendedorCodigo: { $ne: sellerCode } },
      { $set: { vendedorCodigo: sellerCode } },
    );

    await rebuildAllAnalyticsTotals();

    return {
      propietario: ownerMapping.propietarioNombre,
      oportunidadesActualizadas: update.modifiedCount,
    };
  }

  if ((ownerMapping || sellerMapping) && !replaceExisting) {
    const conflicts = [];

    if (ownerMapping) {
      conflicts.push(
        `El propietario ya esta asociado al vendedor #${ownerMapping.vendedorCodigo}.`,
      );
    }

    if (sellerMapping) {
      conflicts.push(
        `El vendedor #${sellerCode} ya tiene asociado a ${sellerMapping.propietarioNombre}.`,
      );
    }

    throw new AssociationConflictError(conflicts.join(" "));
  }

  try {
    if (sellerMapping && sellerMapping.propietarioClave !== ownerKey) {
      await AsociacionPropietarioVendedor.deleteOne({ _id: sellerMapping._id });
      await Oportunidad.updateMany(
        { propietarioClave: sellerMapping.propietarioClave },
        { $set: { vendedorCodigo: null } },
      );
    }

    if (ownerMapping) {
      await AsociacionPropietarioVendedor.updateOne(
        { _id: ownerMapping._id },
        {
          $set: {
            propietarioNombre: opportunityOwner.propietarioNombre,
            vendedorCodigo: sellerCode,
          },
        },
      );
    } else {
      await AsociacionPropietarioVendedor.create({
        propietarioNombre: opportunityOwner.propietarioNombre,
        propietarioClave: ownerKey,
        vendedorCodigo: sellerCode,
      });
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AssociationConflictError(
        "El propietario o el vendedor ya tiene una asociacion.",
      );
    }

    throw error;
  }

  const update = await Oportunidad.updateMany(
    { propietarioClave: ownerKey },
    { $set: { vendedorCodigo: sellerCode } },
  );

  await rebuildAllAnalyticsTotals();

  return {
    propietario: opportunityOwner.propietarioNombre,
    oportunidadesActualizadas: update.modifiedCount,
    reemplazada: Boolean(ownerMapping || sellerMapping),
  };
}
