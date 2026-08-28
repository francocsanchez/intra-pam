import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "server-only";

import {
  buildCentralLoginUrl,
  CentralSessionForbiddenError,
  readCentralSession,
} from "@/lib/auth/central-shared";

export { buildCentralLoginUrl, buildCentralLogoutUrl, getAppRole, hasAppAccess } from "@/lib/auth/central-shared";
export { buildCentralProfileUrl } from "@/lib/auth/central-shared";

function getRequestOrigin(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

function getRequestPath(requestHeaders: Headers) {
  return requestHeaders.get("next-url") ?? "/";
}

function getCurrentReturnTo(requestHeaders: Headers) {
  return new URL(getRequestPath(requestHeaders), getRequestOrigin(requestHeaders)).toString();
}

export async function getCentralSession(cookieHeader?: string | null) {
  const result = await readCentralSession(cookieHeader);

  if (result.status === "forbidden") {
    throw new CentralSessionForbiddenError();
  }

  return result.status === "authenticated" ? result.session : null;
}

export async function requireCentralSession() {
  const requestHeaders = await headers();
  const result = await readCentralSession(requestHeaders.get("cookie"));

  if (result.status === "authenticated") {
    return result.session;
  }

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  redirect(buildCentralLoginUrl(getCurrentReturnTo(requestHeaders)));
}

export async function getCurrentCentralSession() {
  const requestHeaders = await headers();
  return readCentralSession(requestHeaders.get("cookie"));
}
