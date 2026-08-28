import { connection } from "next/server";

import { PamSummaryDashboard } from "@/components/pam-summary-dashboard";
import { getPamSummaryDashboard } from "@/lib/rendimiento";

export default async function ResumenPage({
  searchParams,
}: PageProps<"/resumen">) {
  await connection();
  const { periodo } = await searchParams;
  const dashboard = await getPamSummaryDashboard(
    typeof periodo === "string" ? periodo : null,
  );

  return <PamSummaryDashboard initialData={dashboard} />;
}
