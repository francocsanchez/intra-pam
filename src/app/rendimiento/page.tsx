import { connection } from "next/server";

import { PerformanceDashboard } from "@/components/performance-dashboard";
import { getPerformanceDashboard } from "@/lib/rendimiento";

export default async function RendimientoPage({
  searchParams,
}: PageProps<"/rendimiento">) {
  await connection();
  const { periodo, suborigen } = await searchParams;
  const dashboard = await getPerformanceDashboard(
    typeof periodo === "string" ? periodo : null,
    typeof suborigen === "string" ? suborigen : null,
  );

  return <PerformanceDashboard initialData={dashboard} />;
}
