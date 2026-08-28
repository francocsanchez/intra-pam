import { parse } from "csv-parse/sync";

export const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_ROWS = 50_000;

export const OPPORTUNITY_HEADERS = [
  "Id. de la oportunidad",
  "Propietario de oportunidad",
  "Origen de la oportunidad",
  "Tipo de registro de la oportunidad",
  "Nombre de la oportunidad",
  "Etapa",
  "Fecha de cierre",
  "Fecha de creación",
  "Presupuesto sincronizado",
] as const;

export type ParsedOpportunity = {
  oportunidadId: string;
  propietarioNombre: string;
  propietarioClave: string;
  origen: string | null;
  tipoRegistro: string | null;
  nombre: string | null;
  etapa: string | null;
  fechaCierre: Date | null;
  fechaCreacion: Date | null;
  presupuestoSincronizado: boolean;
};

export class CsvValidationError extends Error {
  constructor(public readonly details: string[]) {
    super("El archivo CSV contiene errores de validacion.");
    this.name = "CsvValidationError";
  }
}

export function normalizeOwner(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-AR");
}

function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function parseDate(value: string | undefined, field: string, row: number) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);

  if (!match) {
    throw new Error(`Fila ${row}: ${field} debe usar el formato dd/MM/yyyy.`);
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Fila ${row}: ${field} contiene una fecha invalida.`);
  }

  return date;
}

export function parseOpportunityCsv(buffer: Buffer): ParsedOpportunity[] {
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
  const validHeaders =
    headers.length === OPPORTUNITY_HEADERS.length &&
    OPPORTUNITY_HEADERS.every((header) => headers.includes(header));

  if (!validHeaders) {
    throw new CsvValidationError([
      `Los encabezados deben ser: ${OPPORTUNITY_HEADERS.join("; ")}.`,
    ]);
  }

  const dataRows = rows.slice(1);

  if (dataRows.length > MAX_CSV_ROWS) {
    throw new CsvValidationError([
      `El archivo supera el limite de ${MAX_CSV_ROWS.toLocaleString("es-AR")} registros.`,
    ]);
  }

  const column = new Map(headers.map((header, index) => [header, index]));
  const value = (row: string[], header: (typeof OPPORTUNITY_HEADERS)[number]) =>
    row[column.get(header)!];
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const opportunities: ParsedOpportunity[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (row.length !== headers.length) {
      errors.push(`Fila ${rowNumber}: la cantidad de columnas no es valida.`);
      return;
    }

    const oportunidadId = value(row, "Id. de la oportunidad")?.trim() ?? "";
    const propietarioNombre =
      value(row, "Propietario de oportunidad")?.trim().replace(/\s+/g, " ") ??
      "";

    if (!oportunidadId) {
      errors.push(`Fila ${rowNumber}: falta el identificador de la oportunidad.`);
    } else if (seenIds.has(oportunidadId)) {
      errors.push(`Fila ${rowNumber}: el identificador ${oportunidadId} esta duplicado.`);
    } else {
      seenIds.add(oportunidadId);
    }

    if (!propietarioNombre) {
      errors.push(`Fila ${rowNumber}: falta el propietario de la oportunidad.`);
    }

    try {
      const fechaCierre = parseDate(
        value(row, "Fecha de cierre"),
        "Fecha de cierre",
        rowNumber,
      );
      const fechaCreacion = parseDate(
        value(row, "Fecha de creación"),
        "Fecha de creación",
        rowNumber,
      );

      if (oportunidadId && propietarioNombre) {
        opportunities.push({
          oportunidadId,
          propietarioNombre,
          propietarioClave: normalizeOwner(propietarioNombre),
          origen: optionalText(value(row, "Origen de la oportunidad")),
          tipoRegistro: optionalText(
            value(row, "Tipo de registro de la oportunidad"),
          ),
          nombre: optionalText(value(row, "Nombre de la oportunidad")),
          etapa: optionalText(value(row, "Etapa")),
          fechaCierre,
          fechaCreacion,
          presupuestoSincronizado: Boolean(
            value(row, "Presupuesto sincronizado")?.trim(),
          ),
        });
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Fila ${rowNumber}: fecha invalida.`);
    }
  });

  if (errors.length > 0) {
    throw new CsvValidationError(errors.slice(0, 50));
  }

  return opportunities;
}
