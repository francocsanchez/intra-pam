import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readOpportunityDashboardSnapshotMock } = vi.hoisted(() => ({
  readOpportunityDashboardSnapshotMock: vi.fn(),
}));

vi.mock("./analytics-totals", () => ({
  readOpportunityDashboardSnapshot: readOpportunityDashboardSnapshotMock,
  rebuildAllAnalyticsTotals: vi.fn(),
}));

vi.mock("./mongodb", () => ({
  getMongoConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../models/oportunidad", () => ({
  Oportunidad: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../models/asociacion-propietario-vendedor", () => ({
  AsociacionPropietarioVendedor: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../models/importacion-oportunidades", () => ({
  ImportacionOportunidades: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./asociaciones", () => ({
  synchronizeOpportunitySellerMappings: vi.fn().mockResolvedValue(0),
}));

vi.mock("./oportunidades/csv", () => ({
  parseOpportunityCsv: vi.fn(),
  CsvValidationError: class CsvValidationError extends Error {},
}));

vi.mock("./oportunidades/colaboradores", () => ({
  parseOpportunityCollaboratorCsv: vi.fn(),
}));

vi.mock("./suborigenes", () => ({
  getOriginSuboriginNames: vi.fn(),
  normalizeOrigin: vi.fn((value: string) => value),
}));

vi.mock("./propietarios-clasificacion", () => ({
  ensureOwnerClassifications: vi.fn(),
  getOpportunityOwnerClassifications: vi.fn(),
}));

import { getOpportunityDashboard } from "./oportunidades";

describe("dashboard de oportunidades totalizado", () => {
  beforeEach(() => {
    readOpportunityDashboardSnapshotMock.mockReset();
  });

  it("delegates dashboard reads to the snapshot store", async () => {
    readOpportunityDashboardSnapshotMock.mockResolvedValueOnce({
      periodos: ["2026-08", "2026-07"],
      periodoSeleccionado: "2026-08",
      total: 12,
      estadoGlobal: { abiertas: 7, cerradas: 5 },
      tendenciaMensual: [],
      colaboracionGlobal: [],
      tiposRegistroGlobal: [],
      suborigenesGlobal: [],
      suborigenesPeriodo: [],
      conversionPeriodo: [],
      porEtapa: [],
      porPropietario: [],
    });

    const dashboard = await getOpportunityDashboard("2026-08");

    expect(readOpportunityDashboardSnapshotMock).toHaveBeenCalledWith("2026-08");
    expect(dashboard.total).toBe(12);
    expect(dashboard.estadoGlobal).toEqual({ abiertas: 7, cerradas: 5 });
  });

  it("preserves the current contract when there is no selected period", async () => {
    readOpportunityDashboardSnapshotMock.mockResolvedValueOnce({
      periodos: [],
      periodoSeleccionado: null,
      total: 0,
      estadoGlobal: { abiertas: 0, cerradas: 0 },
      tendenciaMensual: [],
      colaboracionGlobal: [],
      tiposRegistroGlobal: [],
      suborigenesGlobal: [],
      suborigenesPeriodo: [],
      conversionPeriodo: [],
      porEtapa: [],
      porPropietario: [],
    });

    const dashboard = await getOpportunityDashboard();

    expect(dashboard).toEqual({
      periodos: [],
      periodoSeleccionado: null,
      total: 0,
      estadoGlobal: { abiertas: 0, cerradas: 0 },
      tendenciaMensual: [],
      colaboracionGlobal: [],
      tiposRegistroGlobal: [],
      suborigenesGlobal: [],
      suborigenesPeriodo: [],
      conversionPeriodo: [],
      porEtapa: [],
      porPropietario: [],
    });
  });
});
