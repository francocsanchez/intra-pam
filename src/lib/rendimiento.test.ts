import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  readPerformanceDashboardSnapshotMock,
  readPamSummarySnapshotMock,
  rebuildPerformanceAnalyticsTotalsMock,
  preLeadFindMock,
  preLeadFindOneMock,
  preLeadSyncIndexesMock,
} = vi.hoisted(() => ({
  readPerformanceDashboardSnapshotMock: vi.fn(),
  readPamSummarySnapshotMock: vi.fn(),
  rebuildPerformanceAnalyticsTotalsMock: vi.fn().mockResolvedValue(undefined),
  preLeadFindMock: vi.fn(),
  preLeadFindOneMock: vi.fn(),
  preLeadSyncIndexesMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./analytics-totals", () => ({
  readPerformanceDashboardSnapshot: readPerformanceDashboardSnapshotMock,
  readPamSummarySnapshot: readPamSummarySnapshotMock,
  rebuildPerformanceAnalyticsTotals: rebuildPerformanceAnalyticsTotalsMock,
}));

vi.mock("./mongodb", () => ({
  getMongoConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../models/oportunidad", () => ({
  Oportunidad: {
    init: vi.fn().mockResolvedValue(undefined),
    distinct: vi.fn().mockResolvedValue(["Plan de ahorro", "Usados"]),
  },
}));

vi.mock("../models/pre-lead-mensual", () => ({
  PreLeadMensual: {
    init: vi.fn().mockResolvedValue(undefined),
    syncIndexes: preLeadSyncIndexesMock,
    find: preLeadFindMock,
    findOne: preLeadFindOneMock,
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    distinct: vi.fn().mockResolvedValue(["Central Digital"]),
  },
}));

vi.mock("./suborigenes", () => ({
  getSuborigenes: vi.fn().mockResolvedValue([
    { id: "1", nombre: "Central Digital", activo: true, origenesAsociados: 0 },
  ]),
}));

import { getPamSummaryDashboard, getPerformanceDashboard } from "./rendimiento";

describe("rendimiento comercial totalizado", () => {
  beforeEach(() => {
    readPerformanceDashboardSnapshotMock.mockReset();
    readPamSummarySnapshotMock.mockReset();
  });

  it("delegates dashboard reads to the performance snapshot store", async () => {
    readPerformanceDashboardSnapshotMock.mockResolvedValueOnce({
      periodos: ["2026-08", "2026-07"],
      periodoSeleccionado: "2026-08",
      suborigenes: ["Central Digital"],
      suborigenSeleccionado: "Central Digital",
      negocios: [
        {
          tipoRegistro: "Plan de ahorro",
          preLeads: 50,
          leads: 30,
          tasaConversion: 0.6,
          ventas: 6,
          tasaCierre: 0.2,
          tasaPreLeads: 0.12,
          presupuesto: 5000,
          gasto: 3000,
          costoPorVenta: 500,
          costoPorVentaAnterior: 400,
          variacionCostoPorVenta: 0.25,
          periodoAnterior: "2026-07",
        },
      ],
      resumen: {
        tipoRegistro: "Total general",
        preLeads: 50,
        leads: 30,
        tasaConversion: 0.6,
        ventas: 6,
        tasaCierre: 0.2,
        tasaPreLeads: 0.12,
        presupuesto: 5000,
        gasto: 3000,
        costoPorVenta: 500,
        costoPorVentaAnterior: 400,
        variacionCostoPorVenta: 0.25,
        periodoAnterior: "2026-07",
      },
    });

    const dashboard = await getPerformanceDashboard("2026-08", "Central Digital");

    expect(readPerformanceDashboardSnapshotMock).toHaveBeenCalledWith(
      "2026-08",
      "Central Digital",
    );
    expect(dashboard.suborigenSeleccionado).toBe("Central Digital");
    expect(dashboard.negocios).toHaveLength(1);
  });

  it("delegates PAM summary reads to the materialized snapshot store", async () => {
    readPamSummarySnapshotMock.mockResolvedValueOnce({
      periodos: ["2026-08", "2026-07"],
      periodoSeleccionado: "2026-08",
      anioSeleccionado: "2026",
      tendenciaAnualPreLeads: [],
      tiposRegistroMensual: [{ nombre: "Plan de ahorro", total: 20 }],
      conversionMensual: [
        {
          suborigen: "Central Digital",
          tipoRegistro: "Plan de ahorro",
          leads: 12,
          ventas: 3,
        },
      ],
    });

    const summary = await getPamSummaryDashboard("2026-08");

    expect(readPamSummarySnapshotMock).toHaveBeenCalledWith("2026-08");
    expect(summary.periodoSeleccionado).toBe("2026-08");
    expect(summary.tiposRegistroMensual).toHaveLength(1);
  });
});
