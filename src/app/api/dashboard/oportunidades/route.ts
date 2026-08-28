import { isDashboardPeriod } from "@/lib/dashboard-contract";
import { getOpportunityDashboard } from "@/lib/oportunidades";

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("periodo");

  if (period && !isDashboardPeriod(period)) {
    return Response.json(
      { error: "El periodo debe tener el formato YYYY-MM." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    return Response.json(await getOpportunityDashboard(period), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "No se pudo consultar el dashboard de oportunidades." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
