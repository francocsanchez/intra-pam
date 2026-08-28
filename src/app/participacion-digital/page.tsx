import { connection } from "next/server";

import { DigitalParticipationDashboard } from "@/components/digital-participation-dashboard";
import { getDigitalParticipationDashboard } from "@/lib/rendimiento";

export default async function ParticipacionDigitalPage({
  searchParams,
}: PageProps<"/participacion-digital">) {
  await connection();
  const { periodo } = await searchParams;
  const dashboard = await getDigitalParticipationDashboard(
    typeof periodo === "string" ? periodo : null,
  );

  return <DigitalParticipationDashboard initialData={dashboard} />;
}
