import { getSafeRate } from "./rendimiento-contract";

export type DashboardMetric = {
  nombre: string;
  total: number;
};

export type DashboardOwnerMetric = DashboardMetric & {
  abiertas: number;
  cerradas: number;
};

export type DashboardMonthlyTrend = {
  periodo: string;
  abiertas: number;
  cerradas: number;
  total: number;
  porTipoRegistro: Record<string, number>;
};

export type DashboardConversionMetric = {
  suborigen: string;
  tipoRegistro: string;
  leads: number;
  ventas: number;
};

export type OpportunityDashboard = {
  periodos: string[];
  periodoSeleccionado: string | null;
  total: number;
  estadoGlobal: {
    abiertas: number;
    cerradas: number;
  };
  tendenciaMensual: DashboardMonthlyTrend[];
  colaboracionGlobal: DashboardMetric[];
  tiposRegistroGlobal: DashboardMetric[];
  suborigenesGlobal: DashboardMetric[];
  suborigenesPeriodo: DashboardMetric[];
  conversionPeriodo: DashboardConversionMetric[];
  porEtapa: DashboardMetric[];
  porPropietario: DashboardOwnerMetric[];
};

export const OPEN_OPPORTUNITY_STAGE_PATTERN = /^(negociaci[oó]n|inicial)$/i;
export const SALE_OPPORTUNITY_STAGE_PATTERN = /^venta(?:\s+plan)?$/i;

export function isOpenOpportunityStage(value: string | null | undefined) {
  return OPEN_OPPORTUNITY_STAGE_PATTERN.test(value?.trim() ?? "");
}

export function isSaleOpportunityStage(value: string | null | undefined) {
  return SALE_OPPORTUNITY_STAGE_PATTERN.test(value?.trim() ?? "");
}

export function getLeadConversionRate(leads: number, sales: number) {
  return getSafeRate(sales, leads);
}

export function isDashboardPeriod(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getDashboardPeriodRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const until = new Date(Date.UTC(year, month, 1));

  return { from, until };
}

export function fillDashboardMonthlyTrend(
  values: DashboardMonthlyTrend[],
): DashboardMonthlyTrend[] {
  if (!values.length) return [];

  const totals = new Map(values.map((value) => [value.periodo, value]));
  const [startYear, startMonth] = values[0].periodo.split("-").map(Number);
  const [endYear, endMonth] = values.at(-1)!.periodo.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonth - 1, 1));
  const result: DashboardMonthlyTrend[] = [];

  while (cursor <= end) {
    const periodo = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    result.push(
      totals.get(periodo) ?? {
        periodo,
        abiertas: 0,
        cerradas: 0,
        total: 0,
        porTipoRegistro: {},
      },
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}

export function normalizeDashboardLabel(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function groupDashboardMetrics(
  values: Array<string | null | undefined>,
  fallback: string,
): DashboardMetric[] {
  const totals = new Map<string, number>();

  for (const value of values) {
    const label = normalizeDashboardLabel(value, fallback);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  return [...totals.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((left, right) => right.total - left.total || left.nombre.localeCompare(right.nombre, "es"));
}

export function getCollaborationMetrics(
  total: number,
  collaborated: number,
): DashboardMetric[] {
  const safeTotal = Math.max(0, total);
  const safeCollaborated = Math.min(safeTotal, Math.max(0, collaborated));

  return [
    { nombre: "Colaboradas", total: safeCollaborated },
    { nombre: "No colaboradas", total: safeTotal - safeCollaborated },
  ];
}

export function reduceDashboardOwners(
  owners: DashboardOwnerMetric[],
  limit = 8,
): DashboardOwnerMetric[] {
  if (owners.length <= limit) return owners;

  const visible = owners.slice(0, limit);
  const others = owners.slice(limit).reduce(
    (totals, owner) => ({
      abiertas: totals.abiertas + owner.abiertas,
      cerradas: totals.cerradas + owner.cerradas,
      total: totals.total + owner.total,
    }),
    { abiertas: 0, cerradas: 0, total: 0 },
  );
  return [...visible, { nombre: "Otros", ...others }];
}
