import { describe, expect, it, vi } from "vitest";

const { getVendorAnalysisDashboardMock, VendorAnalysisNotFoundErrorMock } = vi.hoisted(() => ({
  getVendorAnalysisDashboardMock: vi.fn(),
  VendorAnalysisNotFoundErrorMock: class VendorAnalysisNotFoundError extends Error {},
}));

vi.mock("../../../../../lib/vendedor-analisis", () => ({
  getVendorAnalysisDashboard: getVendorAnalysisDashboardMock,
  VendorAnalysisNotFoundError: VendorAnalysisNotFoundErrorMock,
}));

import { GET } from "./route";

describe("GET /api/vendedores/[codigo]/analisis", () => {
  it("rechaza códigos y períodos inválidos", async () => {
    const invalidCode = await GET(
      new Request("http://localhost/api/vendedores/abc/analisis"),
      { params: Promise.resolve({ codigo: "abc" }) },
    );
    const invalidPeriod = await GET(
      new Request("http://localhost/api/vendedores/12/analisis?periodo=2026-13"),
      { params: Promise.resolve({ codigo: "12" }) },
    );

    expect(invalidCode.status).toBe(400);
    expect(invalidPeriod.status).toBe(400);
    await expect(invalidPeriod.json()).resolves.toEqual({
      error: "El período debe tener el formato YYYY-MM.",
    });
  });

  it("devuelve el tablero y deshabilita caché", async () => {
    getVendorAnalysisDashboardMock.mockResolvedValueOnce({ vendedor: { codigo: 12 } });

    const response = await GET(
      new Request("http://localhost/api/vendedores/12/analisis?periodo=2026-08"),
      { params: Promise.resolve({ codigo: "12" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(getVendorAnalysisDashboardMock).toHaveBeenCalledWith(12, "2026-08");
  });

  it("informa vendedor inexistente o inactivo", async () => {
    getVendorAnalysisDashboardMock.mockRejectedValueOnce(new VendorAnalysisNotFoundErrorMock("No encontrado"));

    const response = await GET(
      new Request("http://localhost/api/vendedores/12/analisis"),
      { params: Promise.resolve({ codigo: "12" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });
});
