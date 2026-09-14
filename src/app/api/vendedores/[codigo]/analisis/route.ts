import { isVendorAnalysisPeriod } from "../../../../../lib/vendedor-analisis-contract";
import {
  getVendorAnalysisDashboard,
  VendorAnalysisNotFoundError,
} from "../../../../../lib/vendedor-analisis";

type RouteProps = {
  params: Promise<{ codigo: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { codigo } = await params;
  const sellerCode = Number(codigo);
  const period = new URL(request.url).searchParams.get("periodo");

  if (!Number.isInteger(sellerCode) || sellerCode <= 0) {
    return Response.json(
      { error: "El código de vendedor no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  if (period && !isVendorAnalysisPeriod(period)) {
    return Response.json(
      { error: "El período debe tener el formato YYYY-MM." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    return Response.json(
      await getVendorAnalysisDashboard(sellerCode, period),
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof VendorAnalysisNotFoundError) {
      return Response.json(
        { error: error.message },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return Response.json(
      { error: "No se pudo consultar el análisis del vendedor." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
