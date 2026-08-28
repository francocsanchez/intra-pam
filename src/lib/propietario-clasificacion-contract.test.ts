import { describe, expect, it } from "vitest";

import {
  DEFAULT_OWNER_CLASSIFICATION_GROUP,
  isOpportunityOwnerGroup,
  normalizeOpportunityOwnerGroup,
} from "./propietario-clasificacion-contract";

describe("clasificacion de propietarios", () => {
  it("normaliza y valida los grupos permitidos", () => {
    expect(DEFAULT_OWNER_CLASSIFICATION_GROUP).toBe("Vendedor");
    expect(isOpportunityOwnerGroup("Vendedor")).toBe(true);
    expect(isOpportunityOwnerGroup("Gerencia")).toBe(true);
    expect(isOpportunityOwnerGroup("Call Center")).toBe(true);
    expect(isOpportunityOwnerGroup("Otro")).toBe(false);

    expect(normalizeOpportunityOwnerGroup(" vendedor ")).toBe("Vendedor");
    expect(normalizeOpportunityOwnerGroup("GERENCIA")).toBe("Gerencia");
    expect(normalizeOpportunityOwnerGroup("call center")).toBe("Call Center");
    expect(normalizeOpportunityOwnerGroup("callcenter")).toBeNull();
  });
});
