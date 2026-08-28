import { deleteSuborigen, SuborigenConflictError, SuborigenValidationError, updateSuborigen } from "@/lib/suborigenes";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json() as { nombre?: unknown; activo?: unknown };
    const values: { nombre?: string; activo?: boolean } = {};
    if (body.nombre !== undefined) {
      if (typeof body.nombre !== "string") throw new SuborigenValidationError("El nombre del suborigen no es valido.");
      values.nombre = body.nombre;
    }
    if (body.activo !== undefined) {
      if (typeof body.activo !== "boolean") throw new SuborigenValidationError("El estado del suborigen no es valido.");
      values.activo = body.activo;
    }
    return Response.json(await updateSuborigen((await params).id, values));
  } catch (error) {
    if (error instanceof SuborigenValidationError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof SuborigenConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "No se pudo actualizar el suborigen." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    await deleteSuborigen((await params).id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SuborigenValidationError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof SuborigenConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "No se pudo eliminar el suborigen." }, { status: 500 });
  }
}
