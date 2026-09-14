import { connection } from "next/server";
import { notFound } from "next/navigation";

import { VendorAnalysisDashboard } from "@/components/vendor-analysis-dashboard";
import { isVendorAnalysisPeriod } from "@/lib/vendedor-analisis-contract";
import {
  getVendorAnalysisDashboard,
  VendorAnalysisNotFoundError,
} from "@/lib/vendedor-analisis";

type PageProps = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ periodo?: string | string[] }>;
};

export default async function VendorAnalysisPage({ params, searchParams }: PageProps) {
  await connection();
  const [{ codigo }, query] = await Promise.all([params, searchParams]);
  const sellerCode = Number(codigo);
  const period = Array.isArray(query.periodo) ? query.periodo[0] : query.periodo;

  if (!Number.isInteger(sellerCode) || sellerCode <= 0 || (period && !isVendorAnalysisPeriod(period))) {
    notFound();
  }

  let dashboard;
  try {
    dashboard = await getVendorAnalysisDashboard(sellerCode, period ?? null);
  } catch (error) {
    if (error instanceof VendorAnalysisNotFoundError) notFound();
    throw error;
  }

  return <VendorAnalysisDashboard initialData={dashboard} />;
}
