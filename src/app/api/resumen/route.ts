import { getPamSummaryDashboard } from "@/lib/rendimiento";
import { isPerformancePeriod } from "../../../lib/rendimiento-contract";

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("periodo");

  if (period && !isPerformancePeriod(period)) {
    return Response.json(
      { error: "El periodo debe tener el formato YYYY-MM." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    return Response.json(await getPamSummaryDashboard(period), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "No se pudo consultar el resumen PAM." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
