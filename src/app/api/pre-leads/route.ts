import {
  createPreLead,
  getPreLeads,
  PreLeadConflictError,
  PreLeadValidationError,
} from "@/lib/rendimiento";

export async function GET() {
  try {
    return Response.json(await getPreLeads(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json({ error: "No se pudieron consultar los pre leads." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json(await createPreLead(await request.json() as {
      periodo?: unknown;
      tipoRegistro?: unknown;
      suborigen?: unknown;
      total?: unknown;
      presupuesto?: unknown;
      gasto?: unknown;
    }), { status: 201 });
  } catch (error) {
    if (error instanceof PreLeadValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PreLeadConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "No se pudo crear el registro de pre leads." }, { status: 500 });
  }
}
