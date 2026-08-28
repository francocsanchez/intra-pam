import { setOriginSuborigen, SuborigenConflictError, SuborigenValidationError } from "@/lib/suborigenes";

type RouteContext = { params: Promise<{ origenNormalizado: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json() as { suborigenId?: unknown };
    if (body.suborigenId !== null && typeof body.suborigenId !== "string") throw new SuborigenValidationError("El suborigen seleccionado no es valido.");
    return Response.json(await setOriginSuborigen((await params).origenNormalizado, body.suborigenId));
  } catch (error) {
    if (error instanceof SuborigenValidationError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof SuborigenConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "No se pudo actualizar la asociacion del origen." }, { status: 500 });
  }
}
