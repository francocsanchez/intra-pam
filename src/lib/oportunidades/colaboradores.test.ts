import { describe, expect, it } from "vitest";

import {
  COLLABORATOR_HEADERS,
  parseOpportunityCollaboratorCsv,
} from "./colaboradores";
import { CsvValidationError } from "./csv";

function csv(...rows: string[][]) {
  return Buffer.from(
    [COLLABORATOR_HEADERS, ...rows].map((row) => row.join(";")).join("\r\n"),
    "latin1",
  );
}

describe("parseOpportunityCollaboratorCsv", () => {
  it("interpreta miembros cargados y vacios", () => {
    const result = parseOpportunityCollaboratorCsv(
      csv(
        ["OP-1", "Florencia Ortiz"],
        ["OP-2", ""],
      ),
    );

    expect(result).toEqual([
      { oportunidadId: "OP-1", colaborador: true },
      { oportunidadId: "OP-2", colaborador: false },
    ]);
  });

  it("rechaza encabezados incompletos", () => {
    expect(() =>
      parseOpportunityCollaboratorCsv(Buffer.from("Id. de la oportunidad\r\nOP-1")),
    ).toThrow(CsvValidationError);
  });

  it("rechaza identificadores duplicados", () => {
    expect(() =>
      parseOpportunityCollaboratorCsv(
        csv(["OP-1", "Uno"], ["OP-1", "Dos"]),
      ),
    ).toThrow(CsvValidationError);
  });

  it("rechaza filas sin identificador", () => {
    expect(() =>
      parseOpportunityCollaboratorCsv(csv(["", "Uno"])),
    ).toThrow(CsvValidationError);
  });
});
