import { describe, expect, it } from "vitest";

import {
  getDashboardPeriodRange,
  getCollaborationMetrics,
  getLeadConversionRate,
  fillDashboardMonthlyTrend,
  groupDashboardMetrics,
  isOpenOpportunityStage,
  isSaleOpportunityStage,
  isDashboardPeriod,
  reduceDashboardOwners,
} from "./dashboard-contract";

describe("dashboard de oportunidades", () => {
  it("agrupa etapas y propietarios normalizando valores vacios", () => {
    expect(groupDashboardMetrics(["Venta", null, "  ", "Venta"], "Sin etapa")).toEqual([
      { nombre: "Sin etapa", total: 2 },
      { nombre: "Venta", total: 2 },
    ]);
    expect(groupDashboardMetrics(["Ana", "Ana", ""], "Sin propietario")).toEqual([
      { nombre: "Ana", total: 2 },
      { nombre: "Sin propietario", total: 1 },
    ]);
    expect(groupDashboardMetrics(["Digital", null], "Sin suborigen")).toEqual([
      { nombre: "Digital", total: 1 },
      { nombre: "Sin suborigen", total: 1 },
    ]);
  });

  it("calcula el rango UTC exacto del mes", () => {
    const range = getDashboardPeriodRange("2026-02");
    expect(range.from.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(range.until.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("completa con cero los meses sin oportunidades en la tendencia", () => {
    expect(fillDashboardMonthlyTrend([
      { periodo: "2026-01", abiertas: 3, cerradas: 1, total: 4, porTipoRegistro: { Nuevo: 4 } },
      { periodo: "2026-03", abiertas: 1, cerradas: 1, total: 2, porTipoRegistro: { Usado: 2 } },
    ])).toEqual([
      { periodo: "2026-01", abiertas: 3, cerradas: 1, total: 4, porTipoRegistro: { Nuevo: 4 } },
      { periodo: "2026-02", abiertas: 0, cerradas: 0, total: 0, porTipoRegistro: {} },
      { periodo: "2026-03", abiertas: 1, cerradas: 1, total: 2, porTipoRegistro: { Usado: 2 } },
    ]);
  });

  it("valida periodos y agrupa propietarios secundarios", () => {
    expect(isDashboardPeriod("2026-12")).toBe(true);
    expect(isDashboardPeriod("2026-13")).toBe(false);
    expect(reduceDashboardOwners([
      { nombre: "A", abiertas: 3, cerradas: 1, total: 4 },
      { nombre: "B", abiertas: 1, cerradas: 1, total: 2 },
      { nombre: "C", abiertas: 0, cerradas: 1, total: 1 },
    ], 2)).toEqual([
      { nombre: "A", abiertas: 3, cerradas: 1, total: 4 },
      { nombre: "B", abiertas: 1, cerradas: 1, total: 2 },
      { nombre: "Otros", abiertas: 0, cerradas: 1, total: 1 },
    ]);
  });

  it("considera abiertas las etapas Negociacion e Inicial", () => {
    expect(isOpenOpportunityStage("Negociacion")).toBe(true);
    expect(isOpenOpportunityStage("Negociación")).toBe(true);
    expect(isOpenOpportunityStage("  INICIAL ")).toBe(true);
    expect(isOpenOpportunityStage("Venta ganada")).toBe(false);
    expect(isOpenOpportunityStage(null)).toBe(false);
  });

  it("separa oportunidades colaboradas del resto de la cartera", () => {
    expect(getCollaborationMetrics(10, 3)).toEqual([
      { nombre: "Colaboradas", total: 3 },
      { nombre: "No colaboradas", total: 7 },
    ]);
  });

  it("calcula ventas y tasa de conversion para la tabla comercial", () => {
    expect(isSaleOpportunityStage("Venta")).toBe(true);
    expect(isSaleOpportunityStage("  VENTA PLAN ")).toBe(true);
    expect(isSaleOpportunityStage("Venta convencional")).toBe(false);
    expect(isSaleOpportunityStage("Cerrada ganada")).toBe(false);
    expect(getLeadConversionRate(25, 5)).toBe(0.2);
    expect(getLeadConversionRate(0, 0)).toBe(0);
  });
});
