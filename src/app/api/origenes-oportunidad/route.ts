import { getOrigenesOportunidad } from "@/lib/suborigenes";

export async function GET() {
  try {
    return Response.json(await getOrigenesOportunidad(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json({ error: "No se pudieron consultar los origenes." }, { status: 500 });
  }
}
