import { describe, expect, it } from "vitest";

import {
  fillAnnualOperationSeries,
  fillAnnualClosingRateSeries,
  fillDailyOperationSeries,
  isVendorAnalysisPeriod,
  normalizeVendorFamilyName,
  normalizeVendorModelName,
} from "./vendedor-analisis-contract";

describe("contrato de análisis de vendedor", () => {
  it("valida el formato de período esperado", () => {
    expect(isVendorAnalysisPeriod("2026-08")).toBe(true);
    expect(isVendorAnalysisPeriod("2026-13")).toBe(false);
    expect(isVendorAnalysisPeriod("08-2026")).toBe(false);
  });

  it("completa los doce meses del año con cero operaciones", () => {
    const series = fillAnnualOperationSeries(2026, [
      { periodo: "2026-01", total: 3 },
      { periodo: "2026-03", total: 8 },
    ]);

    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ periodo: "2026-01", total: 3 });
    expect(series[1]).toEqual({ periodo: "2026-02", total: 0 });
    expect(series[2]).toEqual({ periodo: "2026-03", total: 8 });
  });

  it("calcula tasa de cierre anual por oportunidades y ventas", () => {
    const series = fillAnnualClosingRateSeries(2026, [
      { periodo: "2026-01", oportunidades: 39, ventas: 4 },
    ]);

    expect(series[0]).toEqual({
      periodo: "2026-01",
      oportunidades: 39,
      ventas: 4,
      tasaCierre: 4 / 39,
    });
    expect(series[1]).toEqual({
      periodo: "2026-02",
      oportunidades: 0,
      ventas: 0,
      tasaCierre: 0,
    });
  });

  it("completa cada día del mes, incluyendo febrero bisiesto", () => {
    const series = fillDailyOperationSeries("2024-02", [
      { dia: 1, total: 2 },
      { dia: 29, total: 1 },
    ]);

    expect(series).toHaveLength(29);
    expect(series[0]).toEqual({ fecha: "2024-02-01", dia: 1, total: 2 });
    expect(series[1].total).toBe(0);
    expect(series[28]).toEqual({ fecha: "2024-02-29", dia: 29, total: 1 });
  });

  it("normaliza familias incompletas", () => {
    expect(normalizeVendorFamilyName("SUV")).toBe("SUV");
    expect(normalizeVendorFamilyName(null)).toBe("Sin familia");
    expect(normalizeVendorModelName("Corolla")).toBe("Corolla");
    expect(normalizeVendorModelName(null)).toBe("Sin modelo");
  });
});
