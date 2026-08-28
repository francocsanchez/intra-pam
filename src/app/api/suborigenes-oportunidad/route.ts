import { createSuborigen, getSuborigenes, SuborigenConflictError, SuborigenValidationError } from "@/lib/suborigenes";

export async function GET() {
  try {
    return Response.json(await getSuborigenes(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json({ error: "No se pudieron consultar los suborigenes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { nombre?: unknown };
    if (typeof body.nombre !== "string") throw new SuborigenValidationError("El nombre del suborigen es obligatorio.");
    return Response.json(await createSuborigen(body.nombre), { status: 201 });
  } catch (error) {
    if (error instanceof SuborigenValidationError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof SuborigenConflictError) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: "No se pudo crear el suborigen." }, { status: 500 });
  }
}
