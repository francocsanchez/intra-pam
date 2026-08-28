import { NextRequest, NextResponse } from "next/server";

import { buildCentralLogoutUrl } from "@/lib/auth/central";
import { getCentralAuthConfig } from "@/lib/env";

function buildLogoutDocument(logoutUrl: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cerrando sesion</title>
  </head>
  <body>
    <form id="central-logout-form" method="post" action="${logoutUrl}">
      <noscript>
        <button type="submit">Continuar con cierre de sesion</button>
      </noscript>
    </form>
    <script>
      document.getElementById("central-logout-form")?.submit();
    </script>
  </body>
</html>`;
}

function buildLogoutResponse(returnTo: string) {
  const { appUrl } = getCentralAuthConfig();
  const logoutUrl = buildCentralLogoutUrl(new URL(returnTo, appUrl).toString());

  return new NextResponse(buildLogoutDocument(logoutUrl), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  return buildLogoutResponse(returnTo);
}

export async function POST(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  return buildLogoutResponse(returnTo);
}
