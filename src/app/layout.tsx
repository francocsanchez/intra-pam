import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Navbar } from "@/components/navbar";
import {
  buildCentralLoginUrl,
  buildCentralProfileUrl,
  getCurrentCentralSession,
  getAppRole,
} from "@/lib/auth/central";
import { getCentralAuthConfig } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  title: "Intra PAM",
  description: "Analisis interno de fuentes de datos.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const sessionState = await getCurrentCentralSession();

  if (sessionState.status === "unauthenticated") {
    const origin = requestHeaders.get("origin")
      ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
      ?? "http://localhost:3000";
    const pathname = requestHeaders.get("x-pathname") ?? "/";
    redirect(buildCentralLoginUrl(new URL(pathname, origin).toString()));
  }

  const authenticatedSession = sessionState.status === "authenticated"
    ? sessionState.session
    : null;
  const role = authenticatedSession
    ? getAppRole(authenticatedSession, getCentralAuthConfig().appKey)
    : null;

  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <Navbar
          profileUrl={buildCentralProfileUrl()}
          user={
            authenticatedSession
              ? {
                name: authenticatedSession.user.name,
                email: authenticatedSession.user.email,
                role,
              }
              : null
          }
        />
        {children}
      </body>
    </html>
  );
}
