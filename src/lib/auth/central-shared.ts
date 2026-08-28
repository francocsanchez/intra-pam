export type CentralAccessRole = "admin" | "user" | "viewer";

export type CentralSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    isCentralAdmin: boolean;
  };
  session: {
    id: string;
    expiresAt: string;
  };
  access: Array<{
    appKey: string;
    role: CentralAccessRole;
  }>;
};

export type CentralSessionState =
  | { status: "authenticated"; session: CentralSession }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

export class CentralSessionForbiddenError extends Error {
  constructor() {
    super("La sesion central no tiene acceso a esta aplicacion.");
    this.name = "CentralSessionForbiddenError";
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${name}.`);
  }

  return value;
}

function getCentralAuthConfig() {
  return {
    authUrl: required("CENTRAL_AUTH_URL"),
    appUrl: required("NEXT_PUBLIC_APP_URL"),
    appKey: required("CENTRAL_APP_KEY"),
  };
}

function buildSessionUrl() {
  const { authUrl, appKey } = getCentralAuthConfig();
  const url = new URL("/api/internal/session", authUrl);
  url.searchParams.set("appKey", appKey);
  return url;
}

function normalizeCookieHeader(cookieHeader?: string | null) {
  const value = cookieHeader?.trim();
  return value ? value : null;
}

export function hasAppAccess(session: CentralSession, appKey: string) {
  return session.access.some((entry) => entry.appKey === appKey);
}

export function getAppRole(session: CentralSession, appKey: string) {
  const access = session.access.find((entry) => entry.appKey === appKey);
  return access?.role ?? null;
}

export function buildCentralLoginUrl(returnTo: string) {
  const { authUrl, appKey } = getCentralAuthConfig();
  const url = new URL("/login", authUrl);
  url.searchParams.set("appKey", appKey);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function buildCentralLogoutUrl(returnTo: string) {
  const { authUrl } = getCentralAuthConfig();
  const url = new URL("/logout", authUrl);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function buildCentralProfileUrl() {
  const { authUrl } = getCentralAuthConfig();
  return new URL("/profile", authUrl).toString();
}

export async function readCentralSession(
  cookieHeader?: string | null,
): Promise<CentralSessionState> {
  const normalizedCookieHeader = normalizeCookieHeader(cookieHeader);

  if (!normalizedCookieHeader) {
    return { status: "unauthenticated" };
  }

  const response = await fetch(buildSessionUrl(), {
    method: "GET",
    headers: {
      cookie: normalizedCookieHeader,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    return { status: "unauthenticated" };
  }

  if (response.status === 403) {
    return { status: "forbidden" };
  }

  if (!response.ok) {
    throw new Error(
      `Auth Central respondio con un estado inesperado: ${response.status}.`,
    );
  }

  const session = (await response.json()) as CentralSession;
  return { status: "authenticated", session };
}
