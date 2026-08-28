export function cleanSuborigenText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeOrigin(value: string): string {
  return cleanSuborigenText(value).toLocaleLowerCase("es-AR");
}
