import { describe, expect, it } from "vitest";

import {
  buildPerformanceMetric,
  comparePerformanceMetric,
  EMPTY_REGISTRY_TYPE_LABEL,
  getPreviousPerformancePeriod,
  getSafeRate,
  isPerformancePeriod,
  normalizeRegistryType,
  sanitizeMoneyAmount,
  sanitizePreLeadTotal,
} from "./rendimiento-contract";

describe("contrato de rendimiento", () => {
  it("valida periodos y normaliza tipos de registro vacíos", () => {
    expect(isPerformancePeriod("2026-08")).toBe(true);
    expect(isPerformancePeriod("2026-13")).toBe(false);
    expect(normalizeRegistryType("  Plan de ahorro ")).toBe("Plan de ahorro");
    expect(normalizeRegistryType("")).toBe(EMPTY_REGISTRY_TYPE_LABEL);
    expect(normalizeRegistryType(null)).toBe(EMPTY_REGISTRY_TYPE_LABEL);
  });

  it("valida que el total de pre leads sea entero y no negativo", () => {
    expect(sanitizePreLeadTotal(8)).toBe(8);
    expect(sanitizePreLeadTotal(-1)).toBeNull();
    expect(sanitizePreLeadTotal(4.2)).toBeNull();
    expect(sanitizeMoneyAmount(1250.5)).toBe(1250.5);
    expect(sanitizeMoneyAmount(-1)).toBeNull();
  });

  it("calcula las tasas del funnel sin dividir por cero", () => {
    expect(getSafeRate(8, 20)).toBe(0.4);
    expect(getSafeRate(1, 0)).toBe(0);
    const metric = buildPerformanceMetric("Convencional", 100, 36, 4, 5000, 3200, 1000, "2026-07");

    expect(metric).toMatchObject({
      tipoRegistro: "Convencional",
      preLeads: 100,
      leads: 36,
      tasaConversion: 0.36,
      ventas: 4,
      tasaCierre: 4 / 36,
      tasaPreLeads: 0.04,
      presupuesto: 5000,
      gasto: 3200,
      costoPorVenta: 800,
      costoPorVentaAnterior: 1000,
      periodoAnterior: "2026-07",
    });
    expect(metric.variacionCostoPorVenta).toBeCloseTo(-0.2);
  });

  it("calcula el período anterior en formato YYYY-MM", () => {
    expect(getPreviousPerformancePeriod("2026-08")).toBe("2026-07");
    expect(getPreviousPerformancePeriod("2026-01")).toBe("2025-12");
  });

  it("ordena negocios priorizando pre leads, luego leads y ventas", () => {
    const values = [
      buildPerformanceMetric("B", 40, 20, 5),
      buildPerformanceMetric("A", 40, 22, 4),
      buildPerformanceMetric("C", 18, 10, 6),
    ];

    expect(values.sort(comparePerformanceMetric).map((item) => item.tipoRegistro)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });
});
