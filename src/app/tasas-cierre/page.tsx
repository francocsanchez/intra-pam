import { connection } from "next/server";

import { ClosingRatesDashboard } from "@/components/closing-rates-dashboard";
import { getClosingRateDashboard } from "@/lib/rendimiento";

export default async function TasasCierrePage({
  searchParams,
}: PageProps<"/tasas-cierre">) {
  await connection();
  const { periodo, suborigen, tipoRegistro } = await searchParams;
  const dashboard = await getClosingRateDashboard(
    typeof periodo === "string" ? periodo : null,
    typeof suborigen === "string" ? suborigen : null,
    typeof tipoRegistro === "string" ? tipoRegistro : null,
  );

  return <ClosingRatesDashboard initialData={dashboard} />;
}
