export type VendorAnalysisPoint = {
  periodo: string;
  total: number;
};

export type VendorDailyOperationPoint = {
  fecha: string;
  dia: number;
  total: number;
};

export type VendorFamilyMetric = {
  familia: string;
  total: number;
};

export type VendorModelMetric = {
  modelo: string;
  total: number;
};

export type VendorFamilyTreeMetric = VendorFamilyMetric & {
  modelos: VendorModelMetric[];
};

export type VendorClosingRatePoint = {
  periodo: string;
  oportunidades: number;
  ventas: number;
  tasaCierre: number;
};

export type VendorAnalysisDashboard = {
  vendedor: {
    codigo: number;
    nombre: string;
    sucursalNombre: string | null;
  };
  periodos: string[];
  periodoSeleccionado: string | null;
  operacionesAnuales: VendorAnalysisPoint[];
  tasaCierreAnual: VendorClosingRatePoint[];
  operacionesAnualesPorFamilia: VendorFamilyTreeMetric[];
  operacionesPorFamilia: VendorFamilyMetric[];
  operacionesDiarias: VendorDailyOperationPoint[];
};

export function isVendorAnalysisPeriod(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function numberValue(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}

export function getPeriodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end, year, month };
}

export function normalizeVendorFamilyName(family: string | null): string {
  return family?.trim() || "Sin familia";
}

export function normalizeVendorModelName(model: string | null): string {
  return model?.trim() || "Sin modelo";
}

export function fillAnnualOperationSeries(
  year: number,
  rows: VendorAnalysisPoint[],
): VendorAnalysisPoint[] {
  const totals = new Map(rows.map((row) => [row.periodo, numberValue(row.total)]));

  return Array.from({ length: 12 }, (_, index) => {
    const periodo = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { periodo, total: totals.get(periodo) ?? 0 };
  });
}

export function fillAnnualClosingRateSeries(
  year: number,
  rows: Array<{ periodo: string; oportunidades: number; ventas: number }>,
): VendorClosingRatePoint[] {
  const totals = new Map(rows.map((row) => [row.periodo, {
    oportunidades: numberValue(row.oportunidades),
    ventas: numberValue(row.ventas),
  }]));

  return Array.from({ length: 12 }, (_, index) => {
    const periodo = `${year}-${String(index + 1).padStart(2, "0")}`;
    const totalsForPeriod = totals.get(periodo) ?? { oportunidades: 0, ventas: 0 };
    return {
      periodo,
      ...totalsForPeriod,
      tasaCierre: totalsForPeriod.oportunidades > 0
        ? totalsForPeriod.ventas / totalsForPeriod.oportunidades
        : 0,
    };
  });
}

export function fillDailyOperationSeries(
  period: string,
  rows: Array<{ dia: number; total: number }>,
): VendorDailyOperationPoint[] {
  const { start, end } = getPeriodBounds(period);
  const totals = new Map(rows.map((row) => [row.dia, numberValue(row.total)]));
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dia = index + 1;
    return {
      fecha: `${period}-${String(dia).padStart(2, "0")}`,
      dia,
      total: totals.get(dia) ?? 0,
    };
  });
}
