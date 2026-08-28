import { redirect } from "next/navigation";

import { buildCentralLogoutUrl } from "@/lib/auth/central";
import { getCentralAuthConfig } from "@/lib/env";

export async function GET() {
  const { appUrl } = getCentralAuthConfig();
  redirect(buildCentralLogoutUrl(new URL("/", appUrl).toString()));
}
