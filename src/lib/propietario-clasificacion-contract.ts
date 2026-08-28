export const OWNER_CLASSIFICATION_GROUPS = [
  "Vendedor",
  "Gerencia",
  "Call Center",
] as const;

export type OpportunityOwnerGroup =
  (typeof OWNER_CLASSIFICATION_GROUPS)[number];

export const DEFAULT_OWNER_CLASSIFICATION_GROUP: OpportunityOwnerGroup =
  "Vendedor";

export const NON_SELLER_OWNER_CLASSIFICATION_GROUPS: OpportunityOwnerGroup[] =
  ["Gerencia", "Call Center"];

export function isOpportunityOwnerGroup(
  value: unknown,
): value is OpportunityOwnerGroup {
  return (
    typeof value === "string" &&
    OWNER_CLASSIFICATION_GROUPS.includes(
      value as OpportunityOwnerGroup,
    )
  );
}

export function normalizeOpportunityOwnerGroup(
  value: string | null | undefined,
): OpportunityOwnerGroup | null {
  const normalized = value?.trim().toLocaleLowerCase("es-AR");

  switch (normalized) {
    case "vendedor":
      return "Vendedor";
    case "gerencia":
      return "Gerencia";
    case "call center":
      return "Call Center";
    default:
      return null;
  }
}
