import { describe, expect, it, vi } from "vitest";

const { setOpportunityOwnerClassificationMock } = vi.hoisted(() => ({
  setOpportunityOwnerClassificationMock: vi.fn(),
}));

vi.mock("@/lib/propietarios-clasificacion", () => ({
  OwnerClassificationValidationError: class OwnerClassificationValidationError extends Error {},
  setOpportunityOwnerClassification: setOpportunityOwnerClassificationMock,
}));

import { PUT } from "./route";

describe("PUT /api/clasificaciones-propietario-oportunidad/[propietarioClave]", () => {
  it("rechaza grupos inválidos", async () => {
    const response = await PUT(
      new Request("http://localhost/api/clasificaciones-propietario-oportunidad/ana", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupo: 42 }),
      }),
      { params: Promise.resolve({ propietarioClave: "ana" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El grupo seleccionado no es valido.",
    });
    expect(setOpportunityOwnerClassificationMock).not.toHaveBeenCalled();
  });
});
