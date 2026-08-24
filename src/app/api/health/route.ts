import { getDatabaseHealth } from "@/lib/database-health";

export async function GET() {
  const health = await getDatabaseHealth();

  return Response.json(health, {
    status: health.healthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
