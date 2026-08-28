import {
  AssociationConflictError,
  AssociationValidationError,
  setSellerOwnerMapping,
} from "@/lib/asociaciones";

type RouteProps = {
  params: Promise<{ codigo: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  const { codigo } = await params;
  const sellerCode = Number(codigo);

  try {
    const body = (await request.json()) as {
      propietario?: unknown;
      reemplazar?: unknown;
    };

    if (body.propietario !== null && typeof body.propietario !== "string") {
      return Response.json(
        { error: "El propietario debe ser un texto o null." },
        { status: 400 },
      );
    }

    if (body.reemplazar !== undefined && typeof body.reemplazar !== "boolean") {
      return Response.json(
        { error: "Reemplazar debe ser un booleano." },
        { status: 400 },
      );
    }

    return Response.json(
      await setSellerOwnerMapping(
        sellerCode,
        body.propietario ?? null,
        body.reemplazar === true,
      ),
    );
  } catch (error) {
    if (error instanceof AssociationConflictError) {
      return Response.json(
        { error: error.message, requiereConfirmacion: true },
        { status: 409 },
      );
    }

    if (error instanceof AssociationValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "No se pudo actualizar la asociacion." },
      { status: 500 },
    );
  }
}
