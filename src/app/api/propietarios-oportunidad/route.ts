import { getOpportunityOwners } from "@/lib/oportunidades";

export async function GET() {
  try {
    return Response.json(
      { data: await getOpportunityOwners() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron consultar los propietarios." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
