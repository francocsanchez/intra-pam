import { getOpportunitySummary } from "@/lib/oportunidades";

export async function GET() {
  try {
    return Response.json(await getOpportunitySummary(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "No se pudo consultar el resumen de oportunidades." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
