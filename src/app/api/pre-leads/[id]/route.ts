import {
  deletePreLead,
  PreLeadConflictError,
  PreLeadValidationError,
  updatePreLead,
} from "@/lib/rendimiento";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    return Response.json(await updatePreLead(
      (await params).id,
      await request.json() as {
        periodo?: unknown;
        tipoRegistro?: unknown;
        suborigen?: unknown;
        total?: unknown;
        presupuesto?: unknown;
        gasto?: unknown;
      },
    ));
  } catch (error) {
    if (error instanceof PreLeadValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PreLeadConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "No se pudo actualizar el registro de pre leads." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    await deletePreLead((await params).id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof PreLeadValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "No se pudo eliminar el registro de pre leads." }, { status: 500 });
  }
}
