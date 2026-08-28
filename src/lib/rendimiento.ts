import "server-only";

import { isValidObjectId } from "mongoose";

import {
  readClosingRateSnapshot,
  readPerformanceDashboardSnapshot,
  readPamSummarySnapshot,
  rebuildPerformanceAnalyticsTotals,
} from "./analytics-totals";
import { getMongoConnection } from "./mongodb";
import { getSuborigenes } from "./suborigenes";
import { AsociacionOrigenSuborigen } from "../models/asociacion-origen-suborigen";
import { Oportunidad } from "../models/oportunidad";
import { PreLeadMensual } from "../models/pre-lead-mensual";

import {
  type PerformanceDashboard,
  type ClosingRateDashboard,
  type PamSummaryDashboard,
  type PreLeadRecord,
  EMPTY_REGISTRY_TYPE_LABEL,
  EMPTY_SUBORIGIN_LABEL,
  isPerformancePeriod,
  sanitizeMoneyAmount,
  sanitizePreLeadTotal,
} from "./rendimiento-contract";

export class PreLeadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreLeadValidationError";
  }
}

export class PreLeadConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreLeadConflictError";
  }
}

async function preparePerformanceModels() {
  await getMongoConnection();
  await Promise.all([
    Oportunidad.init(),
    typeof PreLeadMensual.syncIndexes === "function"
      ? PreLeadMensual.syncIndexes()
      : PreLeadMensual.init(),
    AsociacionOrigenSuborigen.init(),
  ]);
}

function mapPreLeadRecord(record: {
  _id: unknown;
  periodo: string;
  tipoRegistro: string;
  suborigen?: string | null;
  total: number;
  presupuesto?: number;
  gasto?: number;
  createdAt: Date;
  updatedAt: Date;
}): PreLeadRecord {
  return {
    id: String(record._id),
    periodo: record.periodo,
    tipoRegistro: record.tipoRegistro,
    suborigen: record.suborigen ?? null,
    total: record.total,
    presupuesto: record.presupuesto ?? 0,
    gasto: record.gasto ?? 0,
    creadoEn: record.createdAt.toISOString(),
    actualizadoEn: record.updatedAt.toISOString(),
  };
}

function validatePreLeadIdentity(periodo: string, tipoRegistro: string, suborigen: string) {
  if (!isPerformancePeriod(periodo)) {
    throw new PreLeadValidationError("El periodo debe tener el formato YYYY-MM.");
  }

  const normalizedType = tipoRegistro.trim();
  if (!normalizedType || normalizedType === EMPTY_REGISTRY_TYPE_LABEL) {
    throw new PreLeadValidationError("El tipo de registro no es valido.");
  }

  const normalizedSuborigin = suborigen.trim();
  if (!normalizedSuborigin || normalizedSuborigin === EMPTY_SUBORIGIN_LABEL) {
    throw new PreLeadValidationError("El suborigen no es valido.");
  }

  return { tipoRegistro: normalizedType, suborigen: normalizedSuborigin };
}

export async function getAvailableRegistryTypes() {
  await preparePerformanceModels();

  const registryTypes = await Oportunidad.distinct("tipoRegistro", {
    tipoRegistro: { $type: "string", $ne: "" },
  });

  return registryTypes
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right, "es"));
}

export async function getAvailablePerformanceSuborigins() {
  await preparePerformanceModels();

  const [suboriginCatalog, associatedSuborigins, manualSuborigins] = await Promise.all([
    getSuborigenes(),
    AsociacionOrigenSuborigen.distinct("suborigenNombre", {
      suborigenNombre: { $type: "string", $ne: "" },
    }),
    PreLeadMensual.distinct("suborigen", {
      suborigen: { $type: "string", $ne: "" },
    }),
  ]);

  return [...new Set([
    ...suboriginCatalog.filter((item) => item.activo).map((item) => item.nombre),
    ...associatedSuborigins.map((value) => value.trim()),
    ...manualSuborigins.map((value) => value.trim()),
  ])]
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right, "es"));
}

function validatePreLeadPayload(payload: {
  periodo?: unknown;
  tipoRegistro?: unknown;
  suborigen?: unknown;
  total?: unknown;
  presupuesto?: unknown;
  gasto?: unknown;
}) {
  if (typeof payload.periodo !== "string") {
    throw new PreLeadValidationError("El periodo es obligatorio.");
  }

  if (typeof payload.tipoRegistro !== "string") {
    throw new PreLeadValidationError("El tipo de registro es obligatorio.");
  }
  if (typeof payload.suborigen !== "string") {
    throw new PreLeadValidationError("El suborigen es obligatorio.");
  }

  if (typeof payload.total !== "number") {
    throw new PreLeadValidationError("El total de pre leads es obligatorio.");
  }
  if (typeof payload.presupuesto !== "number") {
    throw new PreLeadValidationError("El presupuesto es obligatorio.");
  }
  if (typeof payload.gasto !== "number") {
    throw new PreLeadValidationError("El gasto es obligatorio.");
  }

  const total = sanitizePreLeadTotal(payload.total);
  if (total === null) {
    throw new PreLeadValidationError("El total de pre leads debe ser un entero mayor o igual a cero.");
  }
  const presupuesto = sanitizeMoneyAmount(payload.presupuesto);
  if (presupuesto === null) {
    throw new PreLeadValidationError("El presupuesto debe ser un número mayor o igual a cero.");
  }
  const gasto = sanitizeMoneyAmount(payload.gasto);
  if (gasto === null) {
    throw new PreLeadValidationError("El gasto debe ser un número mayor o igual a cero.");
  }

  const identity = validatePreLeadIdentity(payload.periodo, payload.tipoRegistro, payload.suborigen);

  return {
    periodo: payload.periodo,
    tipoRegistro: identity.tipoRegistro,
    suborigen: identity.suborigen,
    total,
    presupuesto,
    gasto,
  };
}

async function ensurePreLeadUniqueness(
  periodo: string,
  tipoRegistro: string,
  suborigen: string,
  currentId?: string,
) {
  const existing = await PreLeadMensual.findOne({ periodo, tipoRegistro, suborigen })
    .select({ _id: 1 })
    .lean();

  if (existing && String(existing._id) !== currentId) {
    throw new PreLeadConflictError("Ya existe un registro para ese mes y tipo de registro.");
  }
}

export async function getPreLeads(): Promise<PreLeadRecord[]> {
  await preparePerformanceModels();

  const records = await PreLeadMensual.find({})
    .sort({ periodo: -1, suborigen: 1, tipoRegistro: 1, createdAt: -1 })
    .lean();

  return records.map(mapPreLeadRecord);
}

export async function createPreLead(payload: {
  periodo?: unknown;
  tipoRegistro?: unknown;
  suborigen?: unknown;
  total?: unknown;
  presupuesto?: unknown;
  gasto?: unknown;
}) {
  await preparePerformanceModels();

  const values = validatePreLeadPayload(payload);
  await ensurePreLeadUniqueness(values.periodo, values.tipoRegistro, values.suborigen);

  const record = await PreLeadMensual.create(values);
  await rebuildPerformanceAnalyticsTotals();
  return mapPreLeadRecord(record.toObject());
}

export async function updatePreLead(
  id: string,
  payload: {
    periodo?: unknown;
    tipoRegistro?: unknown;
    suborigen?: unknown;
    total?: unknown;
    presupuesto?: unknown;
    gasto?: unknown;
  },
) {
  await preparePerformanceModels();

  if (!isValidObjectId(id)) {
    throw new PreLeadValidationError("El registro de pre leads no es valido.");
  }

  const values = validatePreLeadPayload(payload);
  await ensurePreLeadUniqueness(values.periodo, values.tipoRegistro, values.suborigen, id);

  const record = await PreLeadMensual.findByIdAndUpdate(id, values, {
    new: true,
    runValidators: true,
  }).lean();

  if (!record) {
    throw new PreLeadValidationError("El registro de pre leads no existe.");
  }

  await rebuildPerformanceAnalyticsTotals();
  return mapPreLeadRecord(record);
}

export async function deletePreLead(id: string) {
  await preparePerformanceModels();

  if (!isValidObjectId(id)) {
    throw new PreLeadValidationError("El registro de pre leads no es valido.");
  }

  const record = await PreLeadMensual.findByIdAndDelete(id).lean();

  if (!record) {
    throw new PreLeadValidationError("El registro de pre leads no existe.");
  }

  await rebuildPerformanceAnalyticsTotals();
}

export async function getPerformanceDashboard(
  requestedPeriod?: string | null,
  requestedSuborigin?: string | null,
): Promise<PerformanceDashboard> {
  return readPerformanceDashboardSnapshot(requestedPeriod, requestedSuborigin);
}

export async function getPamSummaryDashboard(
  requestedPeriod?: string | null,
): Promise<PamSummaryDashboard> {
  return readPamSummarySnapshot(requestedPeriod);
}

export async function getDigitalParticipationDashboard(
  requestedPeriod?: string | null,
): Promise<PamSummaryDashboard> {
  return readPamSummarySnapshot(requestedPeriod);
}

export async function getClosingRateDashboard(
  requestedPeriod?: string | null,
  requestedSuborigin?: string | null,
  requestedRegistryType?: string | null,
): Promise<ClosingRateDashboard> {
  return readClosingRateSnapshot(
    requestedPeriod,
    requestedSuborigin,
    requestedRegistryType,
  );
}
