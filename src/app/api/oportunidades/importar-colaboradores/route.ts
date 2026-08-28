import {
  CsvValidationError,
  importOpportunityCollaborators,
} from "@/lib/oportunidades";
import { MAX_CSV_SIZE_BYTES } from "@/lib/oportunidades/csv";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Seleccione un archivo CSV para importar." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return Response.json(
        { error: "El archivo debe tener extension .csv." },
        { status: 415 },
      );
    }

    if (file.size > MAX_CSV_SIZE_BYTES) {
      return Response.json(
        { error: "El archivo supera el limite de 10 MB." },
        { status: 413 },
      );
    }

    const result = await importOpportunityCollaborators(
      Buffer.from(await file.arrayBuffer()),
      file.name,
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof CsvValidationError) {
      return Response.json(
        { error: error.message, details: error.details },
        { status: 422 },
      );
    }

    console.error(
      "Opportunity collaborator import failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error",
    );

    return Response.json(
      { error: "No se pudo completar la importacion." },
      { status: 500 },
    );
  }
}
