import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rendimiento", () => ({
  getPerformanceDashboard: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/rendimiento", () => {
  it("rechaza periodos inválidos", async () => {
    const response = await GET(new Request("http://localhost/api/rendimiento?periodo=2026-13"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El periodo debe tener el formato YYYY-MM.",
    });
  });
});
