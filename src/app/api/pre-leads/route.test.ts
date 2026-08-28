import { describe, expect, it, vi } from "vitest";

const { createPreLeadMock, PreLeadValidationErrorMock } = vi.hoisted(() => ({
  createPreLeadMock: vi.fn(),
  PreLeadValidationErrorMock: class PreLeadValidationError extends Error {},
}));

vi.mock("@/lib/rendimiento", () => ({
  PreLeadConflictError: class PreLeadConflictError extends Error {},
  PreLeadValidationError: PreLeadValidationErrorMock,
  getPreLeads: vi.fn(),
  createPreLead: createPreLeadMock,
}));

import { POST } from "./route";

describe("POST /api/pre-leads", () => {
  it("rechaza payloads con total inválido", async () => {
    createPreLeadMock.mockRejectedValueOnce(
      new PreLeadValidationErrorMock("El total de pre leads es obligatorio."),
    );

    const response = await POST(new Request("http://localhost/api/pre-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo: "2026-08", tipoRegistro: "Plan", suborigen: "Nippon Digital", total: "2", presupuesto: 10, gasto: 10 }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El total de pre leads es obligatorio.",
    });
    expect(createPreLeadMock).toHaveBeenCalledOnce();
  });
});
