import { NextResponse, type NextRequest } from "next/server";

import {
  buildCentralLoginUrl,
  readCentralSession,
} from "./src/lib/auth/central-shared";

const FORBIDDEN_PATH = "/forbidden";
const LOGOUT_PATH = "/logout";

function isExcludedPath(pathname: string) {
  return (
    pathname === "/favicon.ico"
    || pathname.startsWith("/_next/")
    || pathname === LOGOUT_PATH
  );
}

function getForbiddenResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Acceso denegado para esta aplicación." },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  return NextResponse.redirect(new URL(FORBIDDEN_PATH, request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionState = await readCentralSession(
    request.headers.get("cookie"),
  );

  if (pathname === FORBIDDEN_PATH) {
    if (sessionState.status === "unauthenticated") {
      return NextResponse.redirect(buildCentralLoginUrl(request.url));
    }

    return NextResponse.next();
  }

  if (sessionState.status === "unauthenticated") {
    return NextResponse.redirect(buildCentralLoginUrl(request.url));
  }

  if (sessionState.status === "forbidden") {
    return getForbiddenResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
