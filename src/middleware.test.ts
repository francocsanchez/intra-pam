import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../middleware";
import type { CentralSession } from "./lib/auth/central-shared";

describe("auth middleware", () => {
  const session: CentralSession = {
    user: {
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      isActive: true,
      isCentralAdmin: false,
    },
    session: {
      id: "session-1",
      expiresAt: "2026-08-27T12:00:00.000Z",
    },
    access: [{ appKey: "intra-pam", role: "admin" }],
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setEnv() {
    vi.stubEnv("CENTRAL_AUTH_URL", "http://localhost:3100");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("CENTRAL_APP_KEY", "intra-pam");
  }

  it("redirige al login central cuando no hay sesion", async () => {
    setEnv();
    const request = new NextRequest("http://localhost:3000/oportunidades");

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3100/login?appKey=intra-pam&returnTo=http%3A%2F%2Flocalhost%3A3000%2Foportunidades",
    );
  });

  it("deja pasar cuando la sesion es valida", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(session), { status: 200 }),
      ),
    );
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: "sid=abc" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirige paginas al 403 local cuando auth central rechaza acceso", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    const request = new NextRequest("http://localhost:3000/resumen", {
      headers: { cookie: "sid=abc" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/forbidden",
    );
  });

  it("responde json 403 en las APIs", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    const request = new NextRequest("http://localhost:3000/api/health", {
      headers: { cookie: "sid=abc" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado para esta aplicación.",
    });
  });

  it("excluye assets internos y logout local", async () => {
    setEnv();

    const assetResponse = await middleware(
      new NextRequest("http://localhost:3000/_next/static/chunk.js"),
    );
    const logoutResponse = await middleware(
      new NextRequest("http://localhost:3000/logout"),
    );

    expect(assetResponse.status).toBe(200);
    expect(logoutResponse.status).toBe(200);
  });

  it("permite abrir /forbidden cuando auth central devuelve 403", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    const response = await middleware(
      new NextRequest("http://localhost:3000/forbidden", {
        headers: { cookie: "sid=abc" },
      }),
    );

    expect(response.status).toBe(200);
  });
});
