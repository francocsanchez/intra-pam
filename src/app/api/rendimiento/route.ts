import { getPerformanceDashboard } from "@/lib/rendimiento";
import { isPerformancePeriod } from "../../../lib/rendimiento-contract";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const period = searchParams.get("periodo");
  const suborigin = searchParams.get("suborigen");

  if (period && !isPerformancePeriod(period)) {
    return Response.json(
      { error: "El periodo debe tener el formato YYYY-MM." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    return Response.json(await getPerformanceDashboard(period, suborigin), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "No se pudo consultar el rendimiento comercial." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
