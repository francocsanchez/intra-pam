import { describe, expect, it } from "vitest";

import {
  CsvValidationError,
  OPPORTUNITY_HEADERS,
  parseOpportunityCsv,
} from "./csv";

function csv(...rows: string[][]) {
  return Buffer.from(
    [OPPORTUNITY_HEADERS, ...rows].map((row) => row.join(";")).join("\r\n"),
    "latin1",
  );
}

describe("parseOpportunityCsv", () => {
  it("interpreta Windows-1252, fechas y presupuesto booleano", () => {
    const result = parseOpportunityCsv(
      csv(
        [
          "OP-1",
          "María Pérez",
          "Salón",
          "Vehículos nuevos",
          "Oportunidad uno",
          "Venta",
          "09/01/2026",
          "01/01/2026",
          "Modelo",
        ],
        ["OP-2", "Juan Díaz", "Web", "", "Oportunidad dos", "", "", "", "   "],
      ),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      propietarioNombre: "María Pérez",
      propietarioClave: "maría pérez",
      tipoRegistro: "Vehículos nuevos",
      presupuestoSincronizado: true,
    });
    expect(result[0].fechaCierre?.toISOString()).toBe("2026-01-09T00:00:00.000Z");
    expect(result[1].fechaCierre).toBeNull();
    expect(result[1].fechaCreacion).toBeNull();
    expect(result[1].presupuestoSincronizado).toBe(false);
  });

  it("rechaza identificadores duplicados", () => {
    expect(() =>
      parseOpportunityCsv(
        csv(
          ["OP-1", "Uno", "", "", "", "", "", "", ""],
          ["OP-1", "Dos", "", "", "", "", "", "", ""],
        ),
      ),
    ).toThrow(CsvValidationError);
  });

  it("rechaza fechas imposibles", () => {
    try {
      parseOpportunityCsv(
        csv(["OP-1", "Uno", "", "", "", "", "31/02/2026", "", ""]),
      );
      throw new Error("La fecha invalida no fue rechazada.");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvValidationError);
      expect((error as CsvValidationError).details[0]).toMatch(/fecha invalida/i);
    }
  });

  it("rechaza encabezados incompletos", () => {
    expect(() => parseOpportunityCsv(Buffer.from("Id. de la oportunidad\nOP-1"))).toThrow(
      CsvValidationError,
    );
  });

  it("rechaza identificador y propietario vacios", () => {
    expect(() =>
      parseOpportunityCsv(csv(["", "", "", "", "", "", "", "", ""])),
    ).toThrow(CsvValidationError);
  });
});
