import "server-only";

import { rebuildAllAnalyticsTotals } from "./analytics-totals";
import { getMongoConnection } from "@/lib/mongodb";
import { buildSellerOwnerAnalyticsMatch } from "@/lib/propietarios-analytics";
import {
  DEFAULT_OWNER_CLASSIFICATION_GROUP,
  NON_SELLER_OWNER_CLASSIFICATION_GROUPS,
  normalizeOpportunityOwnerGroup,
  type OpportunityOwnerGroup,
} from "@/lib/propietario-clasificacion-contract";
import { AsociacionPropietarioVendedor } from "@/models/asociacion-propietario-vendedor";
import { ClasificacionPropietarioOportunidad } from "@/models/clasificacion-propietario-oportunidad";
import { Oportunidad } from "@/models/oportunidad";

export type OpportunityOwnerClassification = {
  nombre: string;
  clave: string;
  oportunidades: number;
  vendedorCodigo: number | null;
  grupo: OpportunityOwnerGroup;
};

type OwnerSnapshot = {
  propietarioClave: string;
  propietarioNombre: string;
};

export class OwnerClassificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerClassificationValidationError";
  }
}

async function prepareOwnerClassificationModels() {
  await getMongoConnection();
  await Promise.all([
    Oportunidad.init(),
    AsociacionPropietarioVendedor.init(),
    ClasificacionPropietarioOportunidad.init(),
  ]);
}

export async function ensureOwnerClassifications(owners: OwnerSnapshot[]) {
  const uniqueOwners = [...new Map(
    owners
      .filter((owner) => owner.propietarioClave && owner.propietarioNombre)
      .map((owner) => [owner.propietarioClave, owner]),
  ).values()];

  if (uniqueOwners.length === 0) {
    return 0;
  }

  await prepareOwnerClassificationModels();

  const result = await ClasificacionPropietarioOportunidad.bulkWrite(
    uniqueOwners.map((owner) => ({
      updateOne: {
        filter: { propietarioClave: owner.propietarioClave },
        update: {
          $set: { propietarioNombre: owner.propietarioNombre },
          $setOnInsert: { grupo: DEFAULT_OWNER_CLASSIFICATION_GROUP },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  return result.upsertedCount + result.modifiedCount;
}

export async function getSellerOwnerAnalyticsMatch() {
  await prepareOwnerClassificationModels();
  const excludedOwners = await ClasificacionPropietarioOportunidad.find({
    grupo: { $in: NON_SELLER_OWNER_CLASSIFICATION_GROUPS },
  })
    .select({ propietarioClave: 1, _id: 0 })
    .lean();

  return buildSellerOwnerAnalyticsMatch(
    excludedOwners.map((owner) => owner.propietarioClave),
  );
}

export async function getOpportunityOwnerClassifications(): Promise<
  OpportunityOwnerClassification[]
> {
  await prepareOwnerClassificationModels();

  const [owners, mappings] = await Promise.all([
    Oportunidad.aggregate<{
      _id: string;
      nombre: string;
      oportunidades: number;
    }>([
      {
        $group: {
          _id: "$propietarioClave",
          nombre: { $first: "$propietarioNombre" },
          oportunidades: { $sum: 1 },
        },
      },
      { $sort: { nombre: 1 } },
    ]),
    AsociacionPropietarioVendedor.find({})
      .select({ propietarioClave: 1, vendedorCodigo: 1, _id: 0 })
      .lean(),
  ]);

  await ensureOwnerClassifications(
    owners.map((owner) => ({
      propietarioClave: owner._id,
      propietarioNombre: owner.nombre,
    })),
  );

  const ownerKeys = owners.map((owner) => owner._id);
  const classifications =
    ownerKeys.length > 0
      ? await ClasificacionPropietarioOportunidad.find({
          propietarioClave: { $in: ownerKeys },
        })
          .select({ propietarioClave: 1, grupo: 1, _id: 0 })
          .lean()
      : [];

  const sellerByOwner = new Map(
    mappings.map((mapping) => [mapping.propietarioClave, mapping.vendedorCodigo]),
  );
  const groupByOwner = new Map(
    classifications.map((classification) => [
      classification.propietarioClave,
      classification.grupo as OpportunityOwnerGroup,
    ]),
  );

  return owners.map((owner) => ({
    nombre: owner.nombre,
    clave: owner._id,
    oportunidades: owner.oportunidades,
    vendedorCodigo: sellerByOwner.get(owner._id) ?? null,
    grupo:
      groupByOwner.get(owner._id) ?? DEFAULT_OWNER_CLASSIFICATION_GROUP,
  }));
}

export async function setOpportunityOwnerClassification(
  ownerKeyValue: string,
  groupValue: string,
) {
  const ownerKey = ownerKeyValue.trim();
  const group = normalizeOpportunityOwnerGroup(groupValue);

  if (!ownerKey) {
    throw new OwnerClassificationValidationError(
      "El propietario no es valido.",
    );
  }

  if (!group) {
    throw new OwnerClassificationValidationError(
      "El grupo seleccionado no es valido.",
    );
  }

  await prepareOwnerClassificationModels();

  const owner = await Oportunidad.findOne({ propietarioClave: ownerKey })
    .select({ propietarioClave: 1, propietarioNombre: 1, _id: 0 })
    .lean();

  if (!owner) {
    throw new OwnerClassificationValidationError(
      "El propietario no existe entre las oportunidades importadas.",
    );
  }

  await ClasificacionPropietarioOportunidad.updateOne(
    { propietarioClave: ownerKey },
    {
      $set: {
        propietarioNombre: owner.propietarioNombre,
        grupo: group,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  await rebuildAllAnalyticsTotals();

  return {
    clave: owner.propietarioClave,
    nombre: owner.propietarioNombre,
    grupo: group,
  };
}
