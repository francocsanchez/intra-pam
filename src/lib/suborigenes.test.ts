import { describe, expect, it } from "vitest";

import { cleanSuborigenText, normalizeOrigin } from "./suborigenes-contract";

describe("suborigenes", () => {
  it("normaliza los espacios y la capitalizacion de origenes", () => {
    expect(cleanSuborigenText("  TASA   WEB ")).toBe("TASA WEB");
    expect(normalizeOrigin("  E-Toyota  ")).toBe("e-toyota");
    expect(normalizeOrigin("Salón   de ventas")).toBe("salón de ventas");
  });

  it("produce la misma clave para variantes equivalentes", () => {
    expect(normalizeOrigin("E-Toyota")).toBe(normalizeOrigin(" e-toyota "));
  });
});
