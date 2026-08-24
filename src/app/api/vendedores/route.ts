import { getVendedoresActivos } from "@/lib/vendedores";

function parsePage(value: string | null): number {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const result = await getVendedoresActivos({
      page: parsePage(searchParams.get("page")),
      search: searchParams.get("q") ?? undefined,
    });

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return Response.json(
      { error: "No se pudo consultar la lista de vendedores." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
