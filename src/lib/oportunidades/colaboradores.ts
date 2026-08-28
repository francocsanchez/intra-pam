import { parse } from "csv-parse/sync";

import {
  CsvValidationError,
  MAX_CSV_ROWS,
  MAX_CSV_SIZE_BYTES,
} from "./csv";

export const COLLABORATOR_HEADERS = [
  "Id. de la oportunidad",
  "Nombre del miembro del equipo",
] as const;

export type ParsedOpportunityCollaborator = {
  oportunidadId: string;
  colaborador: boolean;
};

function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function parseOpportunityCollaboratorCsv(
  buffer: Buffer,
): ParsedOpportunityCollaborator[] {
  if (buffer.length === 0) {
    throw new CsvValidationError(["El archivo esta vacio."]);
  }

  if (buffer.length > MAX_CSV_SIZE_BYTES) {
    throw new CsvValidationError(["El archivo supera el limite de 10 MB."]);
  }

  let rows: string[][];

  try {
    rows = parse(decodeCsv(buffer), {
      bom: true,
      delimiter: ";",
      relax_column_count: false,
      skip_empty_lines: true,
    }) as string[][];
  } catch {
    throw new CsvValidationError([
      "No se pudo interpretar el CSV. Verifique el separador y las comillas.",
    ]);
  }

  if (rows.length === 0) {
    throw new CsvValidationError(["El archivo no contiene encabezados."]);
  }

  const headers = rows[0].map((header) => header.trim());
  const hasRequiredHeaders = COLLABORATOR_HEADERS.every((header) =>
    headers.includes(header),
  );

  if (!hasRequiredHeaders) {
    throw new CsvValidationError([
      `Los encabezados deben incluir: ${COLLABORATOR_HEADERS.join("; ")}.`,
    ]);
  }

  const dataRows = rows.slice(1);

  if (dataRows.length > MAX_CSV_ROWS) {
    throw new CsvValidationError([
      `El archivo supera el limite de ${MAX_CSV_ROWS.toLocaleString("es-AR")} registros.`,
    ]);
  }

  const column = new Map(headers.map((header, index) => [header, index]));
  const opportunityIdColumn = column.get("Id. de la oportunidad");
  const collaboratorColumn = column.get("Nombre del miembro del equipo");

  if (opportunityIdColumn === undefined || collaboratorColumn === undefined) {
    throw new CsvValidationError([
      `Los encabezados deben incluir: ${COLLABORATOR_HEADERS.join("; ")}.`,
    ]);
  }

  const errors: string[] = [];
  const seenIds = new Set<string>();
  const collaborators: ParsedOpportunityCollaborator[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (row.length !== headers.length) {
      errors.push(`Fila ${rowNumber}: la cantidad de columnas no es valida.`);
      return;
    }

    const oportunidadId = row[opportunityIdColumn]?.trim() ?? "";
    const collaboratorName = row[collaboratorColumn]?.trim() ?? "";

    if (!oportunidadId) {
      errors.push(`Fila ${rowNumber}: falta el identificador de la oportunidad.`);
      return;
    }

    if (seenIds.has(oportunidadId)) {
      errors.push(`Fila ${rowNumber}: el identificador ${oportunidadId} esta duplicado.`);
      return;
    }

    seenIds.add(oportunidadId);
    collaborators.push({
      oportunidadId,
      colaborador: collaboratorName.length > 0,
    });
  });

  if (errors.length > 0) {
    throw new CsvValidationError(errors.slice(0, 50));
  }

  return collaborators;
}
