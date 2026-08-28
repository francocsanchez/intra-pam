import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCentralLoginUrl,
  buildCentralLogoutUrl,
  getAppRole,
  hasAppAccess,
  readCentralSession,
  type CentralSession,
} from "./central-shared";

describe("central auth shared helpers", () => {
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
    access: [
      { appKey: "intra-pam", role: "admin" },
      { appKey: "otra-app", role: "viewer" },
    ],
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

  it("arma la url de login central", () => {
    setEnv();

    expect(
      buildCentralLoginUrl("http://localhost:3000/oportunidades"),
    ).toBe(
      "http://localhost:3100/login?appKey=intra-pam&returnTo=http%3A%2F%2Flocalhost%3A3000%2Foportunidades",
    );
  });

  it("arma la url de logout central", () => {
    setEnv();

    expect(
      buildCentralLogoutUrl("http://localhost:3000/"),
    ).toBe(
      "http://localhost:3100/logout?returnTo=http%3A%2F%2Flocalhost%3A3000%2F",
    );
  });

  it("detecta acceso y rol por app", () => {
    expect(hasAppAccess(session, "intra-pam")).toBe(true);
    expect(hasAppAccess(session, "faltante")).toBe(false);
    expect(getAppRole(session, "intra-pam")).toBe("admin");
    expect(getAppRole(session, "faltante")).toBeNull();
  });

  it("devuelve sesion autenticada cuando auth central responde 200", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(session), { status: 200 }),
      ),
    );

    await expect(readCentralSession("sid=abc")).resolves.toEqual({
      status: "authenticated",
      session,
    });
  });

  it("devuelve unauthenticated cuando auth central responde 401", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(readCentralSession("sid=abc")).resolves.toEqual({
      status: "unauthenticated",
    });
  });

  it("devuelve forbidden cuando auth central responde 403", async () => {
    setEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(readCentralSession("sid=abc")).resolves.toEqual({
      status: "forbidden",
    });
  });

  it("no consulta auth central si no hay cookie", async () => {
    setEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(readCentralSession("   ")).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
