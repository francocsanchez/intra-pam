import "server-only";

import { isValidObjectId, Types } from "mongoose";

import {
  rebuildAllAnalyticsTotals,
  rebuildPerformanceAnalyticsTotals,
} from "./analytics-totals";
import { getMongoConnection } from "@/lib/mongodb";
import { cleanSuborigenText, normalizeOrigin } from "@/lib/suborigenes-contract";
import { AsociacionOrigenSuborigen } from "@/models/asociacion-origen-suborigen";
import { Oportunidad } from "@/models/oportunidad";
import { SuborigenOportunidad } from "@/models/suborigen-oportunidad";

export type Suborigen = { id: string; nombre: string; activo: boolean; origenesAsociados: number; oportunidadesAsociadas: number };
export type OrigenOportunidad = { origen: string; origenNormalizado: string; suborigenId: string | null; suborigenNombre: string | null; oportunidades: number };

export class SuborigenValidationError extends Error { constructor(message: string) { super(message); this.name = "SuborigenValidationError"; } }
export class SuborigenConflictError extends Error { constructor(message: string) { super(message); this.name = "SuborigenConflictError"; } }

export { cleanSuborigenText, normalizeOrigin } from "@/lib/suborigenes-contract";

function requireName(value: string, label: string) {
  const name = cleanSuborigenText(value);
  if (!name) throw new SuborigenValidationError(`El ${label} no puede estar vacio.`);
  return name;
}
function requireId(id: string) {
  if (!isValidObjectId(id)) throw new SuborigenValidationError("El identificador de suborigen no es valido.");
  return new Types.ObjectId(id);
}
async function prepareModels() {
  await getMongoConnection();
  await Promise.all([Oportunidad.init(), SuborigenOportunidad.init(), AsociacionOrigenSuborigen.init()]);
}

export async function getOriginSuboriginNames(origins: Array<string | null>) {
  const keys = [...new Set(origins.filter((origin): origin is string => Boolean(origin)).map(normalizeOrigin))];
  if (!keys.length) return new Map<string, string>();
  await prepareModels();
  const associations = await AsociacionOrigenSuborigen.find({ origenNormalizado: { $in: keys } }).select({ origenNormalizado: 1, suborigenNombre: 1, _id: 0 }).lean();
  return new Map(associations.map((item) => [item.origenNormalizado, item.suborigenNombre]));
}

export async function getSuborigenes(): Promise<Suborigen[]> {
  await prepareModels();
  const [suborigenes, associations, origins] = await Promise.all([
    SuborigenOportunidad.find({}).sort({ nombre: 1 }).lean(),
    AsociacionOrigenSuborigen.find({}).lean(),
    Oportunidad.aggregate<{ _id: string; total: number }>([
      { $match: { origen: { $type: "string", $ne: "" } } },
      { $group: { _id: "$origen", total: { $sum: 1 } } },
    ]),
  ]);
  const associationByOrigin = new Map(
    associations.map((item) => [item.origenNormalizado, item]),
  );
  const originsBySuborigin = new Map<string, number>();
  const opportunitiesBySuborigin = new Map<string, number>();

  for (const origin of origins) {
    const association = associationByOrigin.get(normalizeOrigin(origin._id));
    if (!association) continue;
    const suborigenId = String(association.suborigenId);
    opportunitiesBySuborigin.set(
      suborigenId,
      (opportunitiesBySuborigin.get(suborigenId) ?? 0) + origin.total,
    );
  }
  for (const association of associations) {
    const suborigenId = String(association.suborigenId);
    originsBySuborigin.set(suborigenId, (originsBySuborigin.get(suborigenId) ?? 0) + 1);
  }
  return suborigenes.map((item) => ({
    id: String(item._id), nombre: item.nombre, activo: item.activo,
    origenesAsociados: originsBySuborigin.get(String(item._id)) ?? 0,
    oportunidadesAsociadas: opportunitiesBySuborigin.get(String(item._id)) ?? 0,
  }));
}

export async function createSuborigen(nombre: string): Promise<Suborigen> {
  const cleanedName = requireName(nombre, "nombre del suborigen");
  await prepareModels();
  try {
    const item = await SuborigenOportunidad.create({ nombre: cleanedName, nombreNormalizado: normalizeOrigin(cleanedName), activo: true });
    await rebuildPerformanceAnalyticsTotals();
    return { id: String(item._id), nombre: item.nombre, activo: item.activo, origenesAsociados: 0, oportunidadesAsociadas: 0 };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw new SuborigenConflictError("Ya existe un suborigen con ese nombre.");
    throw error;
  }
}

export async function updateSuborigen(id: string, values: { nombre?: string; activo?: boolean }) {
  if (values.nombre === undefined && values.activo === undefined) throw new SuborigenValidationError("Indique un nombre o estado para actualizar.");
  const objectId = requireId(id);
  await prepareModels();
  const current = await SuborigenOportunidad.findById(objectId).lean();
  if (!current) throw new SuborigenValidationError("El suborigen no existe.");
  const name = values.nombre === undefined ? current.nombre : requireName(values.nombre, "nombre del suborigen");
  try {
    await SuborigenOportunidad.updateOne({ _id: objectId }, { $set: { nombre: name, nombreNormalizado: normalizeOrigin(name), ...(values.activo === undefined ? {} : { activo: values.activo }) } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw new SuborigenConflictError("Ya existe un suborigen con ese nombre.");
    throw error;
  }
  if (name !== current.nombre) {
    await AsociacionOrigenSuborigen.updateMany({ suborigenId: objectId }, { $set: { suborigenNombre: name } });
  }
  await rebuildAllAnalyticsTotals();
  return (await getSuborigenes()).find((item) => item.id === id)!;
}

export async function deleteSuborigen(id: string) {
  const objectId = requireId(id);
  await prepareModels();
  if (await AsociacionOrigenSuborigen.exists({ suborigenId: objectId })) throw new SuborigenConflictError("No se puede eliminar un suborigen con origenes asociados.");
  const deleted = await SuborigenOportunidad.deleteOne({ _id: objectId });
  if (!deleted.deletedCount) throw new SuborigenValidationError("El suborigen no existe.");
  await rebuildPerformanceAnalyticsTotals();
}

export async function getOrigenesOportunidad(): Promise<OrigenOportunidad[]> {
  await prepareModels();
  const [origins, mappings] = await Promise.all([
    Oportunidad.aggregate<{ _id: string; oportunidades: number }>([
      { $match: { origen: { $type: "string", $ne: "" } } },
      { $group: { _id: "$origen", oportunidades: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AsociacionOrigenSuborigen.find({}).lean(),
  ]);
  const byOrigin = new Map(mappings.map((item) => [item.origenNormalizado, item]));
  const grouped = new Map<string, { origen: string; oportunidades: number }>();
  for (const item of origins) {
    const origenNormalizado = normalizeOrigin(item._id);
    const current = grouped.get(origenNormalizado);
    grouped.set(origenNormalizado, {
      origen: current?.origen ?? item._id,
      oportunidades: (current?.oportunidades ?? 0) + item.oportunidades,
    });
  }
  return [...grouped.entries()].map(([origenNormalizado, item]) => {
    const mapping = byOrigin.get(origenNormalizado);
    return { ...item, origenNormalizado, suborigenId: mapping ? String(mapping.suborigenId) : null, suborigenNombre: mapping?.suborigenNombre ?? null };
  }).sort((a, b) => a.origen.localeCompare(b.origen, "es-AR"));
}

export async function setOriginSuborigen(origenValue: string, suborigenId: string | null) {
  const origenNormalizado = normalizeOrigin(origenValue);
  if (!origenNormalizado) throw new SuborigenValidationError("El origen no es valido.");
  await prepareModels();
  const [originOpportunity, oportunidadesActualizadas] = await Promise.all([
    Oportunidad.findOne({ origenNormalizado }).select({ origen: 1, _id: 0 }).lean(),
    Oportunidad.countDocuments({ origenNormalizado }),
  ]);
  if (!originOpportunity?.origen) throw new SuborigenValidationError("El origen no existe entre las oportunidades importadas.");
  if (suborigenId === null) {
    await AsociacionOrigenSuborigen.deleteOne({ origenNormalizado });
    await rebuildAllAnalyticsTotals();
    return { suborigenId: null, suborigenNombre: null, oportunidadesActualizadas };
  }
  const objectId = requireId(suborigenId);
  const suborigen = await SuborigenOportunidad.findById(objectId).lean();
  if (!suborigen) throw new SuborigenValidationError("El suborigen no existe.");
  if (!suborigen.activo) throw new SuborigenValidationError("El suborigen se encuentra inactivo.");
  await AsociacionOrigenSuborigen.findOneAndUpdate({ origenNormalizado }, { $set: { origen: originOpportunity.origen, suborigenId: objectId, suborigenNombre: suborigen.nombre } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await rebuildAllAnalyticsTotals();
  return { suborigenId: String(objectId), suborigenNombre: suborigen.nombre, oportunidadesActualizadas };
}
