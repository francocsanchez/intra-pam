import { getClosingRateDashboard } from "@/lib/rendimiento";
import { isPerformancePeriod } from "@/lib/rendimiento-contract";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const period = searchParams.get("periodo");
  const suborigin = searchParams.get("suborigen");
  const registryType = searchParams.get("tipoRegistro");

  if (period && !isPerformancePeriod(period)) {
    return Response.json(
      { error: "El periodo debe tener el formato YYYY-MM." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    return Response.json(
      await getClosingRateDashboard(period, suborigin, registryType),
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron consultar las tasas de cierre." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
