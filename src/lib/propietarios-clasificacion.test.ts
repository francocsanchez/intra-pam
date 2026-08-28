import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSellerOwnerAnalyticsMatch } from "./propietarios-analytics";

describe("filtro analitico por propietarios vendedores", () => {
  it("excluye propietarios clasificados fuera de ventas", () => {
    expect(
      buildSellerOwnerAnalyticsMatch([
        "gerencia",
        "call-center",
        "gerencia",
      ]),
    ).toEqual({
      propietarioClave: { $nin: ["gerencia", "call-center"] },
    });
  });

  it("no agrega filtro cuando no hay exclusiones", () => {
    expect(buildSellerOwnerAnalyticsMatch([])).toEqual({});
  });
});
