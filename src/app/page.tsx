import { connection } from "next/server";

import { OpportunityDashboard } from "@/components/opportunity-dashboard";
import { getOpportunityDashboard } from "@/lib/oportunidades";

export default async function Home({
  searchParams,
}: PageProps<"/">) {
  await connection();
  const { periodo } = await searchParams;
  const dashboard = await getOpportunityDashboard(
    typeof periodo === "string" ? periodo : null,
  );

  return <OpportunityDashboard initialData={dashboard} />;
}
