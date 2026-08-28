import {
  getOpportunityOwnerClassifications,
  OwnerClassificationValidationError,
} from "@/lib/propietarios-clasificacion";

export async function GET() {
  try {
    return Response.json(await getOpportunityOwnerClassifications(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof OwnerClassificationValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "No se pudieron consultar las clasificaciones." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
