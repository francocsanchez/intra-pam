import "server-only";

import {
  fillDashboardMonthlyTrend,
  getCollaborationMetrics,
  getDashboardPeriodRange,
  isDashboardPeriod,
  type OpportunityDashboard,
} from "./dashboard-contract";
import { getMongoConnection } from "./mongodb";
import { getSellerOwnerAnalyticsMatch } from "./propietarios-clasificacion";
import {
  buildClosingRateSummary,
  buildPerformanceMetric,
  comparePerformanceMetric,
  type ClosingRateDashboard,
  type ClosingRateOwnerMetric,
  type ClosingRateSummary,
  EMPTY_REGISTRY_TYPE_LABEL,
  EMPTY_SUBORIGIN_LABEL,
  fillAnnualPreLeadTrend,
  fillAnnualDigitalParticipationTrend,
  getPreviousPerformancePeriod,
  type PamDigitalParticipationPoint,
  type PamAnnualPreLeadPoint,
  type PamConversionMetric,
  type PamSummaryDashboard,
  type PamTypeMetric,
  type PerformanceDashboard,
  type PerformanceMetric,
  getSafeRate,
} from "./rendimiento-contract";
import { getSuborigenes } from "./suborigenes";
import { DashboardOportunidadesTotalizadas } from "../models/dashboard-oportunidades-totalizadas";
import { Oportunidad } from "../models/oportunidad";
import { PamCierreTotalizado } from "../models/pam-cierre-totalizado";
import { PreLeadMensual } from "../models/pre-lead-mensual";
import { RendimientoTotalizado } from "../models/rendimiento-totalizado";

const ANALYTICS_TOTALS_SOURCE = "analytics-totals-v1";
const ANALYTICS_TOTALS_VERSION = 6;

type DashboardAggregate = {
  conversion: Array<{
    _id: { suborigen: string; tipoRegistro: string };
    leads: number;
    ventas: number;
  }>;
  total: Array<{ total: number }>;
  porEtapa: Array<{ _id: string; total: number }>;
  porSuborigen: Array<{ _id: string; total: number }>;
  porPropietario: Array<{
    _id: string;
    abiertas: number;
    cerradas: number;
    total: number;
  }>;
};

type GlobalStatusAggregate = {
  abiertas: Array<{ total: number }>;
  colaboradas: Array<{ total: number }>;
  total: Array<{ total: number }>;
  porSuborigen: Array<{ _id: string; total: number }>;
  porTipoRegistro: Array<{ _id: string; total: number }>;
};

type MonthlyTrendAggregate = {
  _id: string;
  abiertas: number;
  cerradas: number;
  total: number;
};

type MonthlyTypeAggregate = {
  _id: { periodo: string; tipoRegistro: string };
  total: number;
};

type OpportunityPerformanceRow = {
  _id: {
    periodo: string;
    suborigen: string;
    tipoRegistro: string;
  };
  leads: number;
  ventas: number;
};

type ManualPerformanceRow = {
  _id: {
    periodo: string;
    suborigen: string;
    tipoRegistro: string;
  };
  total: number;
  presupuesto: number;
  gasto: number;
};

type OpportunityDigitalParticipationRow = {
  _id: {
    periodo: string;
    tipoRegistro: string;
  };
  ventasTotales: number;
  ventasColaboradas: number;
};

type OpportunityClosingRateRow = {
  _id: {
    periodo: string;
    suborigen: string;
    tipoRegistro: string;
    propietario: string;
  };
  oportunidades: number;
  ventas: number;
};

type DashboardGlobalSnapshot = {
  periodos: string[];
  estadoGlobal: { abiertas: number; cerradas: number };
  tendenciaMensual: OpportunityDashboard["tendenciaMensual"];
  colaboracionGlobal: OpportunityDashboard["colaboracionGlobal"];
  tiposRegistroGlobal: OpportunityDashboard["tiposRegistroGlobal"];
  suborigenesGlobal: OpportunityDashboard["suborigenesGlobal"];
};

type DashboardPeriodSnapshot = {
  total: number;
  suborigenesPeriodo: OpportunityDashboard["suborigenesPeriodo"];
  conversionPeriodo: OpportunityDashboard["conversionPeriodo"];
  porEtapa: OpportunityDashboard["porEtapa"];
  porPropietario: OpportunityDashboard["porPropietario"];
};

type PerformanceSnapshot = {
  periodo: string;
  suborigenFiltro: string | null;
  periodos: string[];
  negocios: PerformanceMetric[];
  resumen: PerformanceMetric;
  tendenciaAnualPreLeads: PamAnnualPreLeadPoint[];
  tendenciaAnualParticipacionDigital: PamDigitalParticipationPoint[];
  resumenParticipacionDigital: Array<{
    tipoRegistro: string;
    ventasTotales: number;
    ventasColaboradas: number;
    participacion: number;
  }>;
  tiposRegistroMensual: PamTypeMetric[];
  conversionMensual: PamConversionMetric[];
};

type ClosingRateSnapshot = {
  periodo: string;
  suborigenFiltro: string | null;
  tipoRegistroFiltro: string | null;
  periodos: string[];
  suborigenes: string[];
  tiposRegistro: string[];
  propietarios: ClosingRateOwnerMetric[];
  resumen: ClosingRateSummary;
};

export class AnalyticsTotalsNotInitializedError extends Error {
  constructor(message = "La analitica totalizada no esta inicializada.") {
    super(message);
    this.name = "AnalyticsTotalsNotInitializedError";
  }
}

async function prepareAnalyticsTotalsModels() {
  await getMongoConnection();
  await Promise.all([
    Oportunidad.init(),
    typeof PreLeadMensual.syncIndexes === "function"
      ? PreLeadMensual.syncIndexes()
      : PreLeadMensual.init(),
    DashboardOportunidadesTotalizadas.init(),
    PamCierreTotalizado.init(),
    RendimientoTotalizado.init(),
  ]);
}

function buildAnalyticsMetadata(periodosAfectados: string[], updatedAt: Date) {
  return {
    actualizadoEn: updatedAt,
    fuente: ANALYTICS_TOTALS_SOURCE,
    versionCalculo: ANALYTICS_TOTALS_VERSION,
    periodosAfectados,
  };
}

function buildEmptyPerformanceSummary(): PerformanceMetric {
  return buildPerformanceMetric("Total general", 0, 0, 0);
}

function buildEmptyPamSummary(periodos: string[], periodoSeleccionado: string | null): PamSummaryDashboard {
  const anioSeleccionado = periodoSeleccionado?.slice(0, 4) ?? null;

  return {
    periodos,
    periodoSeleccionado,
    anioSeleccionado,
    tendenciaAnualPreLeads: anioSeleccionado ? fillAnnualPreLeadTrend(anioSeleccionado, []) : [],
    tendenciaAnualParticipacionDigital: anioSeleccionado
      ? fillAnnualDigitalParticipationTrend(anioSeleccionado, [])
      : [],
    resumenParticipacionDigital: [],
    tiposRegistroMensual: [],
    conversionMensual: [],
  };
}

function buildEmptyClosingRateSummary(): ClosingRateSummary {
  return buildClosingRateSummary(0, 0, 0);
}

function buildEmptyClosingRateDashboard(
  periodos: string[],
  tiposRegistro: string[],
  suborigenes: string[],
  periodoSeleccionado: string | null,
  tipoRegistroSeleccionado: string | null,
  suborigenSeleccionado: string | null,
): ClosingRateDashboard {
  return {
    periodos,
    periodoSeleccionado,
    tiposRegistro,
    tipoRegistroSeleccionado,
    suborigenes,
    suborigenSeleccionado,
    propietarios: [],
    resumen: buildEmptyClosingRateSummary(),
  };
}

function mergePeriods(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) =>
    right.localeCompare(left, "es"),
  );
}

function buildSuboriginResolutionStages() {
  return [
    {
      $lookup: {
        from: "asociaciones_origen_suborigen",
        localField: "origenNormalizado",
        foreignField: "origenNormalizado",
        as: "suborigenAsociado",
      },
    },
    {
      $set: {
        dashboardSuborigen: {
          $let: {
            vars: {
              value: {
                $trim: {
                  input: {
                    $ifNull: [
                      { $first: "$suborigenAsociado.suborigenNombre" },
                      "",
                    ],
                  },
                },
              },
            },
            in: {
              $cond: [{ $eq: ["$$value", ""] }, EMPTY_SUBORIGIN_LABEL, "$$value"],
            },
          },
        },
      },
    },
    { $unset: "suborigenAsociado" },
  ];
}

async function buildDashboardSnapshots() {
  const analyticsMatch = await getSellerOwnerAnalyticsMatch();
  const [monthlyTrend, [globalStatus], monthlyTypes] = await Promise.all([
    Oportunidad.aggregate<MonthlyTrendAggregate>([
      { $match: analyticsMatch },
      { $match: { fechaCreacion: { $type: "date" } } },
      {
        $set: {
          dashboardAbierta: {
            $regexMatch: {
              input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
              regex: "^(negociaci[oó]n|inicial)$",
              options: "i",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$fechaCreacion",
              format: "%Y-%m",
              timezone: "UTC",
            },
          },
          abiertas: { $sum: { $cond: ["$dashboardAbierta", 1, 0] } },
          cerradas: { $sum: { $cond: ["$dashboardAbierta", 0, 1] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Oportunidad.aggregate<GlobalStatusAggregate>([
      { $match: analyticsMatch },
      ...buildSuboriginResolutionStages(),
      {
        $set: {
          dashboardTipoRegistro: {
            $let: {
              vars: {
                value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
              },
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  EMPTY_REGISTRY_TYPE_LABEL,
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $facet: {
          abiertas: [
            {
              $match: {
                $expr: {
                  $regexMatch: {
                    input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
                    regex: "^(negociaci[oó]n|inicial)$",
                    options: "i",
                  },
                },
              },
            },
            { $count: "total" },
          ],
          total: [{ $count: "total" }],
          colaboradas: [{ $match: { colaborador: true } }, { $count: "total" }],
          porSuborigen: [
            { $group: { _id: "$dashboardSuborigen", total: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
          ],
          porTipoRegistro: [
            { $group: { _id: "$dashboardTipoRegistro", total: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
          ],
        },
      },
    ]),
    Oportunidad.aggregate<MonthlyTypeAggregate>([
      { $match: analyticsMatch },
      { $match: { fechaCreacion: { $type: "date" } } },
      {
        $set: {
          dashboardTipoRegistro: {
            $let: {
              vars: {
                value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
              },
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  EMPTY_REGISTRY_TYPE_LABEL,
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            periodo: {
              $dateToString: {
                date: "$fechaCreacion",
                format: "%Y-%m",
                timezone: "UTC",
              },
            },
            tipoRegistro: "$dashboardTipoRegistro",
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.periodo": 1, total: -1 } },
    ]),
  ]);

  const monthlyTypesByPeriod = new Map<string, Record<string, number>>();
  for (const item of monthlyTypes) {
    const values = monthlyTypesByPeriod.get(item._id.periodo) ?? {};
    values[item._id.tipoRegistro] = item.total;
    monthlyTypesByPeriod.set(item._id.periodo, values);
  }

  const tendenciaMensual = fillDashboardMonthlyTrend(
    monthlyTrend.map((month) => ({
      periodo: month._id,
      abiertas: month.abiertas,
      cerradas: month.cerradas,
      total: month.total,
      porTipoRegistro: monthlyTypesByPeriod.get(month._id) ?? {},
    })),
  );
  const periodos = monthlyTrend.map((month) => month._id).reverse();
  const abiertas = globalStatus?.abiertas[0]?.total ?? 0;
  const totalGlobal = globalStatus?.total[0]?.total ?? 0;
  const estadoGlobal = { abiertas, cerradas: totalGlobal - abiertas };
  const colaboradas = globalStatus?.colaboradas[0]?.total ?? 0;

  const global: DashboardGlobalSnapshot = {
    periodos,
    estadoGlobal,
    tendenciaMensual,
    colaboracionGlobal: getCollaborationMetrics(totalGlobal, colaboradas),
    tiposRegistroGlobal: (globalStatus?.porTipoRegistro ?? []).map((item) => ({
      nombre: item._id,
      total: item.total,
    })),
    suborigenesGlobal: (globalStatus?.porSuborigen ?? []).map((item) => ({
      nombre: item._id,
      total: item.total,
    })),
  };

  const periodDocs = await Promise.all(
    periodos.map(async (periodo) => {
      const { from, until } = getDashboardPeriodRange(periodo);
      const [dashboard] = await Oportunidad.aggregate<DashboardAggregate>([
        { $match: analyticsMatch },
        { $match: { fechaCreacion: { $gte: from, $lt: until } } },
        ...buildSuboriginResolutionStages(),
        {
          $set: {
            dashboardEtapa: {
              $let: {
                vars: { value: { $trim: { input: { $ifNull: ["$etapa", ""] } } } },
                in: { $cond: [{ $eq: ["$$value", ""] }, "Sin etapa", "$$value"] },
              },
            },
            dashboardPropietario: {
              $let: {
                vars: {
                  value: {
                    $trim: { input: { $ifNull: ["$propietarioNombre", ""] } },
                  },
                },
                in: {
                  $cond: [{ $eq: ["$$value", ""] }, "Sin propietario", "$$value"],
                },
              },
            },
            dashboardAbierta: {
              $regexMatch: {
                input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
                regex: "^(negociaci[oó]n|inicial)$",
                options: "i",
              },
            },
            dashboardTipoRegistro: {
              $let: {
                vars: {
                  value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
                },
                in: {
                  $cond: [
                    { $eq: ["$$value", ""] },
                    EMPTY_REGISTRY_TYPE_LABEL,
                    "$$value",
                  ],
                },
              },
            },
            dashboardVenta: {
              $regexMatch: {
                input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
                regex: "^venta(\\s+plan)?$",
                options: "i",
              },
            },
          },
        },
        {
          $facet: {
            total: [{ $count: "total" }],
            porEtapa: [
              { $group: { _id: "$dashboardEtapa", total: { $sum: 1 } } },
              { $sort: { total: -1, _id: 1 } },
            ],
            porSuborigen: [
              { $group: { _id: "$dashboardSuborigen", total: { $sum: 1 } } },
              { $sort: { total: -1, _id: 1 } },
            ],
            conversion: [
              {
                $group: {
                  _id: {
                    suborigen: "$dashboardSuborigen",
                    tipoRegistro: "$dashboardTipoRegistro",
                  },
                  leads: { $sum: 1 },
                  ventas: { $sum: { $cond: ["$dashboardVenta", 1, 0] } },
                },
              },
              { $sort: { "_id.suborigen": 1, "_id.tipoRegistro": 1 } },
            ],
            porPropietario: [
              {
                $group: {
                  _id: "$dashboardPropietario",
                  abiertas: { $sum: { $cond: ["$dashboardAbierta", 1, 0] } },
                  cerradas: { $sum: { $cond: ["$dashboardAbierta", 0, 1] } },
                  total: { $sum: 1 },
                },
              },
              { $sort: { total: -1, _id: 1 } },
            ],
          },
        },
      ]);

      const snapshot: DashboardPeriodSnapshot = {
        total: dashboard?.total[0]?.total ?? 0,
        suborigenesPeriodo: (dashboard?.porSuborigen ?? []).map((item) => ({
          nombre: item._id,
          total: item.total,
        })),
        conversionPeriodo: (dashboard?.conversion ?? []).map((item) => ({
          suborigen: item._id.suborigen,
          tipoRegistro: item._id.tipoRegistro,
          leads: item.leads,
          ventas: item.ventas,
        })),
        porEtapa: (dashboard?.porEtapa ?? []).map((item) => ({
          nombre: item._id,
          total: item.total,
        })),
        porPropietario: (dashboard?.porPropietario ?? []).map((item) => ({
          nombre: item._id,
          abiertas: item.abiertas,
          cerradas: item.cerradas,
          total: item.total,
        })),
      };

      return { periodo, snapshot };
    }),
  );

  return { global, periodDocs };
}

async function buildPerformanceSnapshots() {
  const analyticsMatch = await getSellerOwnerAnalyticsMatch();
  const [suboriginCatalog, opportunityRows, manualRows, digitalRows] = await Promise.all([
    getSuborigenes(),
    Oportunidad.aggregate<OpportunityPerformanceRow>([
      { $match: analyticsMatch },
      { $match: { fechaCreacion: { $type: "date" } } },
      ...buildSuboriginResolutionStages(),
      {
        $set: {
          dashboardPeriodo: {
            $dateToString: {
              date: "$fechaCreacion",
              format: "%Y-%m",
              timezone: "UTC",
            },
          },
          dashboardTipoRegistro: {
            $let: {
              vars: {
                value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
              },
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  EMPTY_REGISTRY_TYPE_LABEL,
                  "$$value",
                ],
              },
            },
          },
          dashboardVenta: {
            $regexMatch: {
              input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
              regex: "^venta(\\s+plan)?$",
              options: "i",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            periodo: "$dashboardPeriodo",
            suborigen: "$dashboardSuborigen",
            tipoRegistro: "$dashboardTipoRegistro",
          },
          leads: { $sum: 1 },
          ventas: { $sum: { $cond: ["$dashboardVenta", 1, 0] } },
        },
      },
    ]),
    PreLeadMensual.aggregate<ManualPerformanceRow>([
      {
        $group: {
          _id: {
            periodo: "$periodo",
            suborigen: "$suborigen",
            tipoRegistro: "$tipoRegistro",
          },
          total: { $sum: "$total" },
          presupuesto: { $sum: "$presupuesto" },
          gasto: { $sum: "$gasto" },
        },
      },
    ]),
    Oportunidad.aggregate<OpportunityDigitalParticipationRow>([
      { $match: analyticsMatch },
      { $match: { fechaCreacion: { $type: "date" } } },
      {
        $set: {
          dashboardPeriodo: {
            $dateToString: {
              date: "$fechaCreacion",
              format: "%Y-%m",
              timezone: "UTC",
            },
          },
          dashboardTipoRegistro: {
            $let: {
              vars: {
                value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
              },
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  EMPTY_REGISTRY_TYPE_LABEL,
                  "$$value",
                ],
              },
            },
          },
          dashboardVentaColaborada: {
            $and: [
              {
                $regexMatch: {
                  input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
                  regex: "^venta(\\s+plan)?$",
                  options: "i",
                },
              },
              { $eq: ["$colaborador", true] },
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            periodo: "$dashboardPeriodo",
            tipoRegistro: "$dashboardTipoRegistro",
          },
          ventasTotales: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
                    regex: "^venta(\\s+plan)?$",
                    options: "i",
                  },
                },
                1,
                0,
              ],
            },
          },
          ventasColaboradas: {
            $sum: { $cond: ["$dashboardVentaColaborada", 1, 0] },
          },
        },
      },
      { $sort: { "_id.periodo": 1, "_id.tipoRegistro": 1 } },
    ]),
  ]);

  const suborigenes = [...new Set([
    ...suboriginCatalog.filter((item) => item.activo).map((item) => item.nombre),
    ...opportunityRows
      .map((item) => item._id.suborigen)
      .filter((value) => value && value !== EMPTY_SUBORIGIN_LABEL),
    ...manualRows
      .map((item) => item._id.suborigen)
      .filter((value) => value && value !== EMPTY_SUBORIGIN_LABEL),
  ])].sort((left, right) => left.localeCompare(right, "es"));

  const opportunityByPeriod = new Map<string, Map<string, { leads: number; ventas: number }>>();
  const opportunityPeriodsByFilter = new Map<string, Set<string>>();

  for (const item of opportunityRows) {
    const filterKeys = [null, item._id.suborigen];

    for (const filterKey of filterKeys) {
      const scopeKey = filterKey ?? "__all__";
      const periodKey = `${scopeKey}::${item._id.periodo}`;
      const byType = opportunityByPeriod.get(periodKey) ?? new Map();
      const current = byType.get(item._id.tipoRegistro) ?? { leads: 0, ventas: 0 };
      current.leads += item.leads;
      current.ventas += item.ventas;
      byType.set(item._id.tipoRegistro, current);
      opportunityByPeriod.set(periodKey, byType);
      const periods = opportunityPeriodsByFilter.get(scopeKey) ?? new Set<string>();
      periods.add(item._id.periodo);
      opportunityPeriodsByFilter.set(scopeKey, periods);
    }
  }

  const manualByPeriod = new Map<
    string,
    Map<string, { preLeads: number; presupuesto: number; gasto: number }>
  >();
  const manualPeriodsByFilter = new Map<string, Set<string>>();

  for (const item of manualRows) {
    const filterKeys = [null, item._id.suborigen];

    for (const filterKey of filterKeys) {
      const scopeKey = filterKey ?? "__all__";
      const periodKey = `${scopeKey}::${item._id.periodo}`;
      const byType = manualByPeriod.get(periodKey) ?? new Map();
      const current = byType.get(item._id.tipoRegistro) ?? {
        preLeads: 0,
        presupuesto: 0,
        gasto: 0,
      };
      current.preLeads += item.total;
      current.presupuesto += item.presupuesto;
      current.gasto += item.gasto;
      byType.set(item._id.tipoRegistro, current);
      manualByPeriod.set(periodKey, byType);
      const periods = manualPeriodsByFilter.get(scopeKey) ?? new Set<string>();
      periods.add(item._id.periodo);
      manualPeriodsByFilter.set(scopeKey, periods);
    }
  }

  const snapshotFilters = [null, ...suborigenes];
  const snapshots: PerformanceSnapshot[] = [];
  const allPeriods = mergePeriods([
    ...(opportunityPeriodsByFilter.get("__all__") ?? new Set<string>()),
    ...(manualPeriodsByFilter.get("__all__") ?? new Set<string>()),
  ]);

  for (const filter of snapshotFilters) {
    const scopeKey = filter ?? "__all__";
    const periodos = mergePeriods([
      ...(opportunityPeriodsByFilter.get(scopeKey) ?? new Set<string>()),
      ...(manualPeriodsByFilter.get(scopeKey) ?? new Set<string>()),
    ]);

    for (const periodo of periodos) {
      const periodoAnterior = getPreviousPerformancePeriod(periodo);
      const currentManual = manualByPeriod.get(`${scopeKey}::${periodo}`) ?? new Map();
      const currentOpportunities =
        opportunityByPeriod.get(`${scopeKey}::${periodo}`) ?? new Map();
      const previousManual =
        manualByPeriod.get(`${scopeKey}::${periodoAnterior}`) ?? new Map();
      const previousOpportunities =
        opportunityByPeriod.get(`${scopeKey}::${periodoAnterior}`) ?? new Map();

      const previousCostByType = new Map<string, number | null>();
      for (const [tipoRegistro, item] of previousManual.entries()) {
        const previousVentas = previousOpportunities.get(tipoRegistro)?.ventas ?? 0;
        previousCostByType.set(
          tipoRegistro,
          previousVentas > 0 ? item.gasto / previousVentas : null,
        );
      }

      const rows = new Map<
        string,
        {
          preLeads: number;
          leads: number;
          ventas: number;
          presupuesto: number;
          gasto: number;
          costoAnterior: number | null;
        }
      >();

      for (const [tipoRegistro, item] of currentManual.entries()) {
        rows.set(tipoRegistro, {
          preLeads: item.preLeads,
          leads: rows.get(tipoRegistro)?.leads ?? 0,
          ventas: rows.get(tipoRegistro)?.ventas ?? 0,
          presupuesto: item.presupuesto,
          gasto: item.gasto,
          costoAnterior: previousCostByType.get(tipoRegistro) ?? null,
        });
      }

      for (const [tipoRegistro, item] of currentOpportunities.entries()) {
        rows.set(tipoRegistro, {
          preLeads: rows.get(tipoRegistro)?.preLeads ?? 0,
          leads: item.leads,
          ventas: item.ventas,
          presupuesto: rows.get(tipoRegistro)?.presupuesto ?? 0,
          gasto: rows.get(tipoRegistro)?.gasto ?? 0,
          costoAnterior:
            rows.get(tipoRegistro)?.costoAnterior ??
            previousCostByType.get(tipoRegistro) ??
            null,
        });
      }

      const negocios = [...rows.entries()]
        .map(([tipoRegistro, item]) =>
          buildPerformanceMetric(
            tipoRegistro,
            item.preLeads,
            item.leads,
            item.ventas,
            item.presupuesto,
            item.gasto,
            item.costoAnterior,
            item.costoAnterior === null ? null : periodoAnterior,
          ),
        )
        .sort(comparePerformanceMetric);

      const previousTotalVentas = [...previousOpportunities.values()].reduce(
        (sum, item) => sum + item.ventas,
        0,
      );
      const previousTotalGasto = [...previousManual.values()].reduce(
        (sum, item) => sum + item.gasto,
        0,
      );
      const resumen = negocios.reduce(
        (totals, item) =>
          buildPerformanceMetric(
            "Total general",
            totals.preLeads + item.preLeads,
            totals.leads + item.leads,
            totals.ventas + item.ventas,
            totals.presupuesto + item.presupuesto,
            totals.gasto + item.gasto,
            previousTotalVentas > 0 ? previousTotalGasto / previousTotalVentas : null,
            previousTotalVentas > 0 ? periodoAnterior : null,
          ),
        buildEmptyPerformanceSummary(),
      );

      snapshots.push({
        periodo,
        suborigenFiltro: filter,
        periodos,
        negocios,
        resumen,
        tendenciaAnualPreLeads: [],
        tendenciaAnualParticipacionDigital: [],
        resumenParticipacionDigital: [],
        tiposRegistroMensual: [],
        conversionMensual: [],
      });
    }
  }

  const preLeadsByScopeAndPeriod = new Map<string, Map<string, number>>();

  for (const item of manualRows) {
    const filterKeys = [null, item._id.suborigen];

    for (const filterKey of filterKeys) {
      const scopeKey = filterKey ?? "__all__";
      const periodKey = `${scopeKey}::${item._id.periodo}`;
      const current = preLeadsByScopeAndPeriod.get(periodKey) ?? new Map<string, number>();
      current.set(item._id.tipoRegistro, (current.get(item._id.tipoRegistro) ?? 0) + item.total);
      preLeadsByScopeAndPeriod.set(periodKey, current);
    }
  }

  const conversionRowsByScopeAndPeriod = new Map<string, PamConversionMetric[]>();

  for (const item of opportunityRows) {
    const row = {
      suborigen: item._id.suborigen,
      tipoRegistro: item._id.tipoRegistro,
      leads: item.leads,
      ventas: item.ventas,
    };

    const scopes = [`__all__::${item._id.periodo}`, `${item._id.suborigen}::${item._id.periodo}`];
    for (const scope of scopes) {
      const rows = conversionRowsByScopeAndPeriod.get(scope) ?? [];
      rows.push(row);
      conversionRowsByScopeAndPeriod.set(scope, rows);
    }
  }

  const digitalParticipationByPeriod = new Map(
    allPeriods.map((periodo) => [periodo, new Map<string, {
      ventasTotales: number;
      ventasColaboradas: number;
    }>()]),
  );

  for (const item of digitalRows) {
    const periodRows = digitalParticipationByPeriod.get(item._id.periodo) ?? new Map<string, {
      ventasTotales: number;
      ventasColaboradas: number;
    }>();
    periodRows.set(item._id.tipoRegistro, {
      ventasTotales: item.ventasTotales,
      ventasColaboradas: item.ventasColaboradas,
    });
    digitalParticipationByPeriod.set(item._id.periodo, periodRows);
  }

  const enrichedSnapshots = snapshots.map((snapshot) => {
    const scopeKey = snapshot.suborigenFiltro ?? "__all__";
    const anioSeleccionado = snapshot.periodo.slice(0, 4);
    const annualPoints = allPeriods
      .filter((periodo) => periodo.startsWith(`${anioSeleccionado}-`))
      .map((periodo) => {
        const values = preLeadsByScopeAndPeriod.get(`${scopeKey}::${periodo}`) ?? new Map();
        const porTipoRegistro = Object.fromEntries(values.entries());

        return {
          periodo,
          total: [...values.values()].reduce((sum, value) => sum + value, 0),
          porTipoRegistro,
        };
      });
    const annualDigitalParticipation = allPeriods
      .filter((periodo) => periodo.startsWith(`${anioSeleccionado}-`))
      .map((periodo) => {
        const values = digitalParticipationByPeriod.get(periodo) ?? new Map();
        const porTipoRegistro = Object.fromEntries(
          [...values.entries()].map(([tipoRegistro, totals]) => [
            tipoRegistro,
            {
              ventasTotales: totals.ventasTotales,
              ventasColaboradas: totals.ventasColaboradas,
              participacion: getSafeRate(totals.ventasColaboradas, totals.ventasTotales),
            },
          ]),
        );

        return {
          periodo,
          porTipoRegistro,
        };
      });

    const monthlyOpportunitiesByType =
      opportunityByPeriod.get(`${scopeKey}::${snapshot.periodo}`) ?? new Map();
    const tiposRegistroMensual = [...monthlyOpportunitiesByType.entries()]
      .map(([nombre, totals]) => ({ nombre, total: totals.leads }))
      .sort((left, right) => right.total - left.total || left.nombre.localeCompare(right.nombre, "es"));

    const conversionMensual = (conversionRowsByScopeAndPeriod.get(`${scopeKey}::${snapshot.periodo}`) ?? [])
      .sort((left, right) =>
        left.suborigen.localeCompare(right.suborigen, "es") ||
        left.tipoRegistro.localeCompare(right.tipoRegistro, "es"),
      );
    const resumenPorTipo = new Map<string, { ventasTotales: number; ventasColaboradas: number }>();
    for (const item of annualDigitalParticipation) {
      for (const [tipoRegistro, totals] of Object.entries(item.porTipoRegistro) as Array<
        [string, { ventasTotales: number; ventasColaboradas: number; participacion: number }]
      >) {
        const current = resumenPorTipo.get(tipoRegistro) ?? {
          ventasTotales: 0,
          ventasColaboradas: 0,
        };
        current.ventasTotales += totals.ventasTotales;
        current.ventasColaboradas += totals.ventasColaboradas;
        resumenPorTipo.set(tipoRegistro, current);
      }
    }
    const resumenParticipacionDigital = [...resumenPorTipo.entries()]
      .map(([tipoRegistro, totals]) => ({
        tipoRegistro,
        ventasTotales: totals.ventasTotales,
        ventasColaboradas: totals.ventasColaboradas,
        participacion: getSafeRate(totals.ventasColaboradas, totals.ventasTotales),
      }))
      .sort((left, right) =>
        right.ventasTotales - left.ventasTotales ||
        right.ventasColaboradas - left.ventasColaboradas ||
        right.participacion - left.participacion ||
        left.tipoRegistro.localeCompare(right.tipoRegistro, "es"),
      );

    return {
      ...snapshot,
      tendenciaAnualPreLeads: fillAnnualPreLeadTrend(anioSeleccionado, annualPoints),
      tendenciaAnualParticipacionDigital: fillAnnualDigitalParticipationTrend(
        anioSeleccionado,
        annualDigitalParticipation,
      ),
      resumenParticipacionDigital,
      tiposRegistroMensual,
      conversionMensual,
    };
  });

  return { allPeriods, suborigenes, snapshots: enrichedSnapshots };
}

async function buildClosingRateSnapshots() {
  const analyticsMatch = await getSellerOwnerAnalyticsMatch();
  const [suboriginCatalog, rows] = await Promise.all([
    getSuborigenes(),
    Oportunidad.aggregate<OpportunityClosingRateRow>([
      { $match: analyticsMatch },
      { $match: { fechaCreacion: { $type: "date" } } },
      ...buildSuboriginResolutionStages(),
      {
        $set: {
          dashboardPeriodo: {
            $dateToString: {
              date: "$fechaCreacion",
              format: "%Y-%m",
              timezone: "UTC",
            },
          },
          dashboardTipoRegistro: {
            $let: {
              vars: {
                value: { $trim: { input: { $ifNull: ["$tipoRegistro", ""] } } },
              },
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  EMPTY_REGISTRY_TYPE_LABEL,
                  "$$value",
                ],
              },
            },
          },
          dashboardPropietario: {
            $let: {
              vars: {
                value: {
                  $trim: { input: { $ifNull: ["$propietarioNombre", ""] } },
                },
              },
              in: {
                $cond: [{ $eq: ["$$value", ""] }, "Sin propietario", "$$value"],
              },
            },
          },
          dashboardVenta: {
            $regexMatch: {
              input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
              regex: "^venta(\\s+plan)?$",
              options: "i",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            periodo: "$dashboardPeriodo",
            suborigen: "$dashboardSuborigen",
            tipoRegistro: "$dashboardTipoRegistro",
            propietario: "$dashboardPropietario",
          },
          oportunidades: { $sum: 1 },
          ventas: { $sum: { $cond: ["$dashboardVenta", 1, 0] } },
        },
      },
    ]),
  ]);

  const periodos = mergePeriods(rows.map((item) => item._id.periodo));
  const tiposRegistro = [...new Set(rows.map((item) => item._id.tipoRegistro))].sort((left, right) =>
    left.localeCompare(right, "es"),
  );
  const suborigenes = [...new Set([
    ...suboriginCatalog.filter((item) => item.activo).map((item) => item.nombre),
    ...rows
      .map((item) => item._id.suborigen)
      .filter((value) => value && value !== EMPTY_SUBORIGIN_LABEL),
  ])].sort((left, right) => left.localeCompare(right, "es"));

  const groupedRows = new Map<string, Map<string, { oportunidades: number; ventas: number }>>();
  const periodsByFilter = new Map<string, Set<string>>();

  for (const item of rows) {
    const suboriginFilters = [null, item._id.suborigen];
    const registryFilters = [null, item._id.tipoRegistro];

    for (const suborigenFiltro of suboriginFilters) {
      for (const tipoRegistroFiltro of registryFilters) {
        const scopeKey = `${suborigenFiltro ?? "__all__"}::${tipoRegistroFiltro ?? "__all__"}::${item._id.periodo}`;
        const byOwner = groupedRows.get(scopeKey) ?? new Map<string, { oportunidades: number; ventas: number }>();
        const current = byOwner.get(item._id.propietario) ?? { oportunidades: 0, ventas: 0 };
        current.oportunidades += item.oportunidades;
        current.ventas += item.ventas;
        byOwner.set(item._id.propietario, current);
        groupedRows.set(scopeKey, byOwner);

        const periodsKey = `${suborigenFiltro ?? "__all__"}::${tipoRegistroFiltro ?? "__all__"}`;
        const periodsForFilter = periodsByFilter.get(periodsKey) ?? new Set<string>();
        periodsForFilter.add(item._id.periodo);
        periodsByFilter.set(periodsKey, periodsForFilter);
      }
    }
  }

  const snapshots: ClosingRateSnapshot[] = [];
  const suboriginFilters = [null, ...suborigenes];
  const registryFilters = [null, ...tiposRegistro];

  for (const suborigenFiltro of suboriginFilters) {
    for (const tipoRegistroFiltro of registryFilters) {
      const periodsKey = `${suborigenFiltro ?? "__all__"}::${tipoRegistroFiltro ?? "__all__"}`;
      const availablePeriods = mergePeriods(periodsByFilter.get(periodsKey) ?? new Set<string>());

      for (const periodo of availablePeriods) {
        const scopeKey = `${suborigenFiltro ?? "__all__"}::${tipoRegistroFiltro ?? "__all__"}::${periodo}`;
        const byOwner = groupedRows.get(scopeKey) ?? new Map<string, { oportunidades: number; ventas: number }>();
        const propietarios = [...byOwner.entries()]
          .map(([propietario, totals]) => ({
            propietario,
            oportunidades: totals.oportunidades,
            ventas: totals.ventas,
            tasaCierre: totals.oportunidades > 0 ? totals.ventas / totals.oportunidades : 0,
          }))
          .sort((left, right) =>
            right.oportunidades - left.oportunidades ||
            right.ventas - left.ventas ||
            right.tasaCierre - left.tasaCierre ||
            left.propietario.localeCompare(right.propietario, "es"),
          );

        const resumen = buildClosingRateSummary(
          propietarios.length,
          propietarios.reduce((sum, item) => sum + item.oportunidades, 0),
          propietarios.reduce((sum, item) => sum + item.ventas, 0),
        );

        snapshots.push({
          periodo,
          suborigenFiltro,
          tipoRegistroFiltro,
          periodos: availablePeriods,
          suborigenes,
          tiposRegistro,
          propietarios,
          resumen,
        });
      }
    }
  }

  return { periodos, suborigenes, tiposRegistro, snapshots };
}

async function replaceDashboardSnapshots(
  updatedAt: Date,
  global: DashboardGlobalSnapshot,
  periodDocs: Array<{ periodo: string; snapshot: DashboardPeriodSnapshot }>,
) {
  await DashboardOportunidadesTotalizadas.deleteMany({});

  const metadata = buildAnalyticsMetadata(global.periodos, updatedAt);
  const docs = [
    {
      scope: "global",
      periodo: null,
      periodos: global.periodos,
      total: 0,
      estadoGlobal: global.estadoGlobal,
      tendenciaMensual: global.tendenciaMensual,
      colaboracionGlobal: global.colaboracionGlobal,
      tiposRegistroGlobal: global.tiposRegistroGlobal,
      suborigenesGlobal: global.suborigenesGlobal,
      suborigenesPeriodo: [],
      conversionPeriodo: [],
      porEtapa: [],
      porPropietario: [],
      ...metadata,
    },
    ...periodDocs.map(({ periodo, snapshot }) => ({
      scope: "periodo",
      periodo,
      periodos: global.periodos,
      total: snapshot.total,
      estadoGlobal: global.estadoGlobal,
      tendenciaMensual: [],
      colaboracionGlobal: [],
      tiposRegistroGlobal: [],
      suborigenesGlobal: [],
      suborigenesPeriodo: snapshot.suborigenesPeriodo,
      conversionPeriodo: snapshot.conversionPeriodo,
      porEtapa: snapshot.porEtapa,
      porPropietario: snapshot.porPropietario,
      ...buildAnalyticsMetadata([periodo], updatedAt),
    })),
  ];

  if (docs.length > 0) {
    await DashboardOportunidadesTotalizadas.insertMany(docs);
  }
}

async function replacePerformanceSnapshots(
  updatedAt: Date,
  catalog: { allPeriods: string[]; suborigenes: string[] },
  snapshots: PerformanceSnapshot[],
) {
  await RendimientoTotalizado.deleteMany({});

  const docs = [
    {
      scope: "catalogo",
      periodo: null,
      suborigenFiltro: null,
      periodos: catalog.allPeriods,
      suborigenes: catalog.suborigenes,
      periodoSeleccionado: null,
      suborigenSeleccionado: null,
      negocios: [],
      resumen: buildEmptyPerformanceSummary(),
      tendenciaAnualPreLeads: [],
      tendenciaAnualParticipacionDigital: [],
      resumenParticipacionDigital: [],
      tiposRegistroMensual: [],
      conversionMensual: [],
      ...buildAnalyticsMetadata(catalog.allPeriods, updatedAt),
    },
    ...snapshots.map((snapshot) => ({
      scope: "snapshot",
      periodo: snapshot.periodo,
      suborigenFiltro: snapshot.suborigenFiltro,
      periodos: snapshot.periodos,
      suborigenes: catalog.suborigenes,
      periodoSeleccionado: snapshot.periodo,
      suborigenSeleccionado: snapshot.suborigenFiltro,
      negocios: snapshot.negocios,
      resumen: snapshot.resumen,
      tendenciaAnualPreLeads: snapshot.tendenciaAnualPreLeads,
      tendenciaAnualParticipacionDigital: snapshot.tendenciaAnualParticipacionDigital,
      resumenParticipacionDigital: snapshot.resumenParticipacionDigital,
      tiposRegistroMensual: snapshot.tiposRegistroMensual,
      conversionMensual: snapshot.conversionMensual,
      ...buildAnalyticsMetadata(snapshot.periodos, updatedAt),
    })),
  ];

  if (docs.length > 0) {
    await RendimientoTotalizado.insertMany(docs);
  }
}

async function replaceClosingRateSnapshots(
  updatedAt: Date,
  catalog: { periodos: string[]; suborigenes: string[]; tiposRegistro: string[] },
  snapshots: ClosingRateSnapshot[],
) {
  await PamCierreTotalizado.deleteMany({});

  const docs = [
    {
      scope: "catalogo",
      periodo: null,
      suborigenFiltro: null,
      tipoRegistroFiltro: null,
      periodos: catalog.periodos,
      suborigenes: catalog.suborigenes,
      tiposRegistro: catalog.tiposRegistro,
      periodoSeleccionado: null,
      suborigenSeleccionado: null,
      tipoRegistroSeleccionado: null,
      propietarios: [],
      resumen: buildEmptyClosingRateSummary(),
      ...buildAnalyticsMetadata(catalog.periodos, updatedAt),
    },
    ...snapshots.map((snapshot) => ({
      scope: "snapshot",
      periodo: snapshot.periodo,
      suborigenFiltro: snapshot.suborigenFiltro,
      tipoRegistroFiltro: snapshot.tipoRegistroFiltro,
      periodos: snapshot.periodos,
      suborigenes: snapshot.suborigenes,
      tiposRegistro: snapshot.tiposRegistro,
      periodoSeleccionado: snapshot.periodo,
      suborigenSeleccionado: snapshot.suborigenFiltro,
      tipoRegistroSeleccionado: snapshot.tipoRegistroFiltro,
      propietarios: snapshot.propietarios,
      resumen: snapshot.resumen,
      ...buildAnalyticsMetadata(snapshot.periodos, updatedAt),
    })),
  ];

  if (docs.length > 0) {
    await PamCierreTotalizado.insertMany(docs);
  }
}

export async function rebuildOpportunityAnalyticsTotals() {
  await prepareAnalyticsTotalsModels();

  const { global, periodDocs } = await buildDashboardSnapshots();
  await replaceDashboardSnapshots(new Date(), global, periodDocs);
}

export async function rebuildPerformanceAnalyticsTotals() {
  await prepareAnalyticsTotalsModels();

  const [{ allPeriods, suborigenes, snapshots }, closingRates] = await Promise.all([
    buildPerformanceSnapshots(),
    buildClosingRateSnapshots(),
  ]);
  const updatedAt = new Date();
  await replacePerformanceSnapshots(updatedAt, { allPeriods, suborigenes }, snapshots);
  await replaceClosingRateSnapshots(updatedAt, closingRates, closingRates.snapshots);
}

export async function rebuildAllAnalyticsTotals() {
  await prepareAnalyticsTotalsModels();

  const [{ global, periodDocs }, { allPeriods, suborigenes, snapshots }, closingRates] =
    await Promise.all([
      buildDashboardSnapshots(),
      buildPerformanceSnapshots(),
      buildClosingRateSnapshots(),
    ]);
  const updatedAt = new Date();
  await replaceDashboardSnapshots(updatedAt, global, periodDocs);
  await replacePerformanceSnapshots(updatedAt, { allPeriods, suborigenes }, snapshots);
  await replaceClosingRateSnapshots(updatedAt, closingRates, closingRates.snapshots);
}

export async function ensureAnalyticsTotalsInitialized() {
  await prepareAnalyticsTotalsModels();
  const [dashboardGlobal, performanceCatalog, closingRatesCatalog] = await Promise.all([
    DashboardOportunidadesTotalizadas.findOne({ scope: "global", periodo: null })
      .select({ versionCalculo: 1, _id: 0 })
      .lean(),
    RendimientoTotalizado.findOne({ scope: "catalogo", periodo: null })
      .select({ versionCalculo: 1, _id: 0 })
      .lean(),
    PamCierreTotalizado.findOne({ scope: "catalogo", periodo: null })
      .select({ versionCalculo: 1, _id: 0 })
      .lean(),
  ]);

  const dashboardReady =
    !!dashboardGlobal && (dashboardGlobal.versionCalculo ?? 0) >= ANALYTICS_TOTALS_VERSION;
  const performanceReady =
    !!performanceCatalog && (performanceCatalog.versionCalculo ?? 0) >= ANALYTICS_TOTALS_VERSION;
  const closingRatesReady =
    !!closingRatesCatalog && (closingRatesCatalog.versionCalculo ?? 0) >= ANALYTICS_TOTALS_VERSION;

  if (dashboardReady && performanceReady && closingRatesReady) {
    return;
  }

  await rebuildAllAnalyticsTotals();
}

export async function readOpportunityDashboardSnapshot(
  requestedPeriod?: string | null,
): Promise<OpportunityDashboard> {
  await ensureAnalyticsTotalsInitialized();

  const global = await DashboardOportunidadesTotalizadas.findOne({
    scope: "global",
    periodo: null,
  }).lean();

  if (!global) {
    throw new AnalyticsTotalsNotInitializedError();
  }

  const periodos = Array.isArray(global.periodos) ? global.periodos : [];
  const periodoSeleccionado =
    requestedPeriod && isDashboardPeriod(requestedPeriod)
      ? requestedPeriod
      : (periodos[0] ?? null);

  if (!periodoSeleccionado) {
    return {
      periodos,
      periodoSeleccionado: null,
      total: 0,
      estadoGlobal: global.estadoGlobal,
      tendenciaMensual: global.tendenciaMensual,
      colaboracionGlobal: global.colaboracionGlobal,
      tiposRegistroGlobal: global.tiposRegistroGlobal,
      suborigenesGlobal: global.suborigenesGlobal,
      suborigenesPeriodo: [],
      conversionPeriodo: [],
      porEtapa: [],
      porPropietario: [],
    };
  }

  const periodSnapshot = await DashboardOportunidadesTotalizadas.findOne({
    scope: "periodo",
    periodo: periodoSeleccionado,
  }).lean();

  return {
    periodos,
    periodoSeleccionado,
    total: periodSnapshot?.total ?? 0,
    estadoGlobal: global.estadoGlobal,
    tendenciaMensual: global.tendenciaMensual,
    colaboracionGlobal: global.colaboracionGlobal,
    tiposRegistroGlobal: global.tiposRegistroGlobal,
    suborigenesGlobal: global.suborigenesGlobal,
    suborigenesPeriodo: periodSnapshot?.suborigenesPeriodo ?? [],
    conversionPeriodo: periodSnapshot?.conversionPeriodo ?? [],
    porEtapa: periodSnapshot?.porEtapa ?? [],
    porPropietario: periodSnapshot?.porPropietario ?? [],
  };
}

export async function readPerformanceDashboardSnapshot(
  requestedPeriod?: string | null,
  requestedSuborigin?: string | null,
): Promise<PerformanceDashboard> {
  await ensureAnalyticsTotalsInitialized();

  const suborigenSeleccionado = requestedSuborigin?.trim()
    ? requestedSuborigin.trim()
    : null;
  const catalog = await RendimientoTotalizado.findOne({
    scope: "catalogo",
    periodo: null,
    suborigenFiltro: null,
  }).lean();

  if (!catalog) {
    throw new AnalyticsTotalsNotInitializedError();
  }

  const snapshotFilter = {
    scope: "snapshot",
    suborigenFiltro: suborigenSeleccionado,
  };
  const availableSnapshots = await RendimientoTotalizado.find(snapshotFilter)
    .select({ periodo: 1, _id: 0 })
    .sort({ periodo: -1 })
    .lean();
  const periodos = availableSnapshots.map((item) => item.periodo).filter(Boolean);
  const periodoSeleccionado =
    requestedPeriod && isDashboardPeriod(requestedPeriod)
      ? requestedPeriod
      : (periodos[0] ?? null);

  if (!periodoSeleccionado) {
    return {
      periodos,
      periodoSeleccionado: null,
      suborigenes: catalog.suborigenes ?? [],
      suborigenSeleccionado,
      negocios: [],
      resumen: buildEmptyPerformanceSummary(),
    };
  }

  const snapshot = await RendimientoTotalizado.findOne({
    ...snapshotFilter,
    periodo: periodoSeleccionado,
  }).lean();

  return {
    periodos,
    periodoSeleccionado,
    suborigenes: catalog.suborigenes ?? [],
    suborigenSeleccionado,
    negocios: snapshot?.negocios ?? [],
    resumen: snapshot?.resumen ?? buildEmptyPerformanceSummary(),
  };
}

export async function readPamSummarySnapshot(
  requestedPeriod?: string | null,
): Promise<PamSummaryDashboard> {
  await ensureAnalyticsTotalsInitialized();

  const catalog = await RendimientoTotalizado.findOne({
    scope: "catalogo",
    periodo: null,
    suborigenFiltro: null,
  }).lean();

  if (!catalog) {
    throw new AnalyticsTotalsNotInitializedError();
  }

  const periodos = Array.isArray(catalog.periodos) ? catalog.periodos : [];
  const periodoSeleccionado =
    requestedPeriod && isDashboardPeriod(requestedPeriod)
      ? requestedPeriod
      : (periodos[0] ?? null);

  if (!periodoSeleccionado) {
    return buildEmptyPamSummary(periodos, null);
  }

  const snapshot = await RendimientoTotalizado.findOne({
    scope: "snapshot",
    suborigenFiltro: null,
    periodo: periodoSeleccionado,
  }).lean();

  if (!snapshot) {
    return buildEmptyPamSummary(periodos, periodoSeleccionado);
  }

  return {
    periodos,
    periodoSeleccionado,
    anioSeleccionado: periodoSeleccionado.slice(0, 4),
    tendenciaAnualPreLeads: snapshot.tendenciaAnualPreLeads ?? fillAnnualPreLeadTrend(periodoSeleccionado.slice(0, 4), []),
    tendenciaAnualParticipacionDigital:
      snapshot.tendenciaAnualParticipacionDigital ??
      fillAnnualDigitalParticipationTrend(periodoSeleccionado.slice(0, 4), []),
    resumenParticipacionDigital: snapshot.resumenParticipacionDigital ?? [],
    tiposRegistroMensual: snapshot.tiposRegistroMensual ?? [],
    conversionMensual: snapshot.conversionMensual ?? [],
  };
}

export async function readClosingRateSnapshot(
  requestedPeriod?: string | null,
  requestedSuborigin?: string | null,
  requestedRegistryType?: string | null,
): Promise<ClosingRateDashboard> {
  await ensureAnalyticsTotalsInitialized();

  const suborigenSeleccionado = requestedSuborigin?.trim()
    ? requestedSuborigin.trim()
    : null;
  const tipoRegistroSeleccionado = requestedRegistryType?.trim()
    ? requestedRegistryType.trim()
    : null;

  const catalog = await PamCierreTotalizado.findOne({
    scope: "catalogo",
    periodo: null,
    suborigenFiltro: null,
    tipoRegistroFiltro: null,
  }).lean();

  if (!catalog) {
    throw new AnalyticsTotalsNotInitializedError();
  }

  const snapshotFilter = {
    scope: "snapshot",
    suborigenFiltro: suborigenSeleccionado,
    tipoRegistroFiltro: tipoRegistroSeleccionado,
  };
  const availableSnapshots = await PamCierreTotalizado.find(snapshotFilter)
    .select({ periodo: 1, _id: 0 })
    .sort({ periodo: -1 })
    .lean();
  const periodos = availableSnapshots.map((item) => item.periodo).filter(Boolean);
  const periodoSeleccionado =
    requestedPeriod && isDashboardPeriod(requestedPeriod)
      ? requestedPeriod
      : (periodos[0] ?? null);

  if (!periodoSeleccionado) {
    return buildEmptyClosingRateDashboard(
      periodos,
      catalog.tiposRegistro ?? [],
      catalog.suborigenes ?? [],
      null,
      tipoRegistroSeleccionado,
      suborigenSeleccionado,
    );
  }

  const snapshot = await PamCierreTotalizado.findOne({
    ...snapshotFilter,
    periodo: periodoSeleccionado,
  }).lean();

  if (!snapshot) {
    return buildEmptyClosingRateDashboard(
      periodos,
      catalog.tiposRegistro ?? [],
      catalog.suborigenes ?? [],
      periodoSeleccionado,
      tipoRegistroSeleccionado,
      suborigenSeleccionado,
    );
  }

  return {
    periodos,
    periodoSeleccionado,
    tiposRegistro: catalog.tiposRegistro ?? [],
    tipoRegistroSeleccionado,
    suborigenes: catalog.suborigenes ?? [],
    suborigenSeleccionado,
    propietarios: snapshot.propietarios ?? [],
    resumen: snapshot.resumen ?? buildEmptyClosingRateSummary(),
  };
}
