import {
  OwnerClassificationValidationError,
  setOpportunityOwnerClassification,
} from "@/lib/propietarios-clasificacion";

type RouteContext = { params: Promise<{ propietarioClave: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json()) as { grupo?: unknown };

    if (typeof body.grupo !== "string") {
      throw new OwnerClassificationValidationError(
        "El grupo seleccionado no es valido.",
      );
    }

    return Response.json(
      await setOpportunityOwnerClassification(
        decodeURIComponent((await params).propietarioClave),
        body.grupo,
      ),
    );
  } catch (error) {
    if (error instanceof OwnerClassificationValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Error al actualizar clasificación de propietario", error);

    return Response.json(
      {
        error: "No se pudo actualizar la clasificación.",
      },
      { status: 500 },
    );
  }
}
