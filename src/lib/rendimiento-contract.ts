export const EMPTY_REGISTRY_TYPE_LABEL = "Sin tipo de registro";
export const EMPTY_SUBORIGIN_LABEL = "Sin suborigen";

export type PreLeadRecord = {
  id: string;
  periodo: string;
  tipoRegistro: string;
  suborigen: string | null;
  total: number;
  presupuesto: number;
  gasto: number;
  creadoEn: string;
  actualizadoEn: string;
};

export type PerformanceMetric = {
  tipoRegistro: string;
  preLeads: number;
  leads: number;
  tasaConversion: number;
  ventas: number;
  tasaCierre: number;
  tasaPreLeads: number;
  presupuesto: number;
  gasto: number;
  costoPorVenta: number;
  costoPorVentaAnterior: number | null;
  variacionCostoPorVenta: number | null;
  periodoAnterior: string | null;
};

export type PamAnnualPreLeadPoint = {
  periodo: string;
  total: number;
  porTipoRegistro: Record<string, number>;
};

export type PamDigitalParticipationPoint = {
  periodo: string;
  porTipoRegistro: Record<string, {
    ventasTotales: number;
    ventasColaboradas: number;
    participacion: number;
  }>;
};

export type PamDigitalParticipationSummary = {
  tipoRegistro: string;
  ventasTotales: number;
  ventasColaboradas: number;
  participacion: number;
};

export type PamTypeMetric = {
  nombre: string;
  total: number;
};

export type PamConversionMetric = {
  suborigen: string;
  tipoRegistro: string;
  leads: number;
  ventas: number;
};

export type ClosingRateOwnerMetric = {
  propietario: string;
  oportunidades: number;
  ventas: number;
  tasaCierre: number;
};

export type ClosingRateSummary = {
  propietarios: number;
  oportunidades: number;
  ventas: number;
  tasaCierre: number;
};

export type PerformanceDashboard = {
  periodos: string[];
  periodoSeleccionado: string | null;
  suborigenes: string[];
  suborigenSeleccionado: string | null;
  negocios: PerformanceMetric[];
  resumen: PerformanceMetric;
};

export type PamSummaryDashboard = {
  periodos: string[];
  periodoSeleccionado: string | null;
  anioSeleccionado: string | null;
  tendenciaAnualPreLeads: PamAnnualPreLeadPoint[];
  tendenciaAnualParticipacionDigital: PamDigitalParticipationPoint[];
  resumenParticipacionDigital: PamDigitalParticipationSummary[];
  tiposRegistroMensual: PamTypeMetric[];
  conversionMensual: PamConversionMetric[];
};

export type ClosingRateDashboard = {
  periodos: string[];
  periodoSeleccionado: string | null;
  tiposRegistro: string[];
  tipoRegistroSeleccionado: string | null;
  suborigenes: string[];
  suborigenSeleccionado: string | null;
  propietarios: ClosingRateOwnerMetric[];
  resumen: ClosingRateSummary;
};

export function isPerformancePeriod(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function normalizeRegistryType(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : EMPTY_REGISTRY_TYPE_LABEL;
}

export function normalizeSuborigin(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : EMPTY_SUBORIGIN_LABEL;
}

export function sanitizePreLeadTotal(value: number) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function sanitizeMoneyAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function getSafeRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function buildClosingRateSummary(
  propietarios: number,
  oportunidades: number,
  ventas: number,
): ClosingRateSummary {
  return {
    propietarios,
    oportunidades,
    ventas,
    tasaCierre: getSafeRate(ventas, oportunidades),
  };
}

export function getPreviousPerformancePeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function fillAnnualPreLeadTrend(
  year: string,
  values: PamAnnualPreLeadPoint[],
): PamAnnualPreLeadPoint[] {
  const totals = new Map(values.map((value) => [value.periodo, value]));

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const periodo = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return totals.get(periodo) ?? {
      periodo,
      total: 0,
      porTipoRegistro: {},
    };
  });
}

export function fillAnnualDigitalParticipationTrend(
  year: string,
  values: PamDigitalParticipationPoint[],
): PamDigitalParticipationPoint[] {
  const totals = new Map(values.map((value) => [value.periodo, value]));

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const periodo = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return totals.get(periodo) ?? {
      periodo,
      porTipoRegistro: {},
    };
  });
}

export function buildPerformanceMetric(
  tipoRegistro: string,
  preLeads: number,
  leads: number,
  ventas: number,
  presupuesto = 0,
  gasto = 0,
  costoPorVentaAnterior: number | null = null,
  periodoAnterior: string | null = null,
): PerformanceMetric {
  const costoPorVenta = getSafeRate(gasto, ventas);

  return {
    tipoRegistro,
    preLeads,
    leads,
    tasaConversion: getSafeRate(leads, preLeads),
    ventas,
    tasaCierre: getSafeRate(ventas, leads),
    tasaPreLeads: getSafeRate(ventas, preLeads),
    presupuesto,
    gasto,
    costoPorVenta,
    costoPorVentaAnterior,
    variacionCostoPorVenta:
      costoPorVentaAnterior && costoPorVentaAnterior > 0
        ? (costoPorVenta / costoPorVentaAnterior) - 1
        : null,
    periodoAnterior,
  };
}

export function comparePerformanceMetric(left: PerformanceMetric, right: PerformanceMetric) {
  return (
    right.preLeads - left.preLeads ||
    right.leads - left.leads ||
    right.ventas - left.ventas ||
    left.tipoRegistro.localeCompare(right.tipoRegistro, "es")
  );
}
