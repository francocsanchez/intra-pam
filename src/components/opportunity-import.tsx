"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

type ImportResponse = Record<string, number | string | undefined>;

type ApiError = {
  error?: string;
  details?: string[];
};

type ImportStage = "idle" | "uploading" | "processing";

type OpportunityImportProps = {
  endpoint: string;
  inputId: string;
  emptyLabel: string;
  loadingLabel: string;
  submitLabel: string;
  successVariant: "oportunidades" | "colaboradores";
};

function formatSuccessMessage(
  result: ImportResponse,
  variant: OpportunityImportProps["successVariant"],
) {
  if (variant === "colaboradores") {
    return `${result.encontrados} encontrados · ${result.actualizados} actualizados · ${result.ignorados} ignorados`;
  }

  return `${result.creados} creados · ${result.actualizados} actualizados · ${result.propietariosPendientes} propietarios pendientes`;
}

function uploadImportFile(endpoint: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<{ status: number; payload: ImportResponse & ApiError }>((resolve, reject) => {
    const formData = new FormData();
    formData.set("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", endpoint);
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    request.onload = () => {
      const payload =
        typeof request.response === "object" && request.response !== null
          ? (request.response as ImportResponse & ApiError)
          : {};

      resolve({ status: request.status, payload });
    };

    request.onerror = () => {
      reject(new Error("upload_failed"));
    };

    request.onabort = () => {
      reject(new Error("upload_aborted"));
    };

    request.send(formData);
  });
}

export function OpportunityImport({
  endpoint,
  inputId,
  emptyLabel,
  loadingLabel,
  submitLabel,
  successVariant,
}: OpportunityImportProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleImport() {
    if (!file || loading) {
      return;
    }

    setLoading(true);
    setStage("uploading");
    setProgress(0);
    setErrors([]);
    setResult(null);

    try {
      const { status, payload } = await uploadImportFile(endpoint, file, (nextProgress) => {
        setProgress(nextProgress);
        if (nextProgress >= 100) {
          setStage("processing");
        }
      });

      if (status < 200 || status >= 300) {
        setErrors(payload.details?.length ? payload.details : [payload.error ?? "La importacion fallo."]);
        return;
      }

      setProgress(100);
      setResult(payload);
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      startTransition(() => router.refresh());
    } catch {
      setErrors(["No se pudo enviar el archivo. Verifique la conexion e intente nuevamente."]);
    } finally {
      setStage("idle");
      setLoading(false);
    }
  }

  const progressLabel =
    stage === "processing"
      ? "Archivo cargado · procesando importación..."
      : `${progress}% cargado`;

  return (
    <div className="import-control">
      <label className="file-picker" htmlFor={inputId}>
        <FileUp aria-hidden="true" />
        <span>{file?.name ?? emptyLabel}</span>
      </label>
      <input
        ref={inputRef}
        className="sr-only"
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setErrors([]);
          setResult(null);
        }}
      />
      <button type="button" onClick={handleImport} disabled={!file || loading}>
        {loading ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
        {loading ? `${loadingLabel} ${stage === "uploading" ? `${progress}%` : ""}`.trim() : submitLabel}
      </button>

      <div className="import-feedback" aria-live="polite">
        {loading && (
          <div className="import-progress" data-stage={stage}>
            <div
              className="import-progress__bar"
              role="progressbar"
              aria-label="Progreso de importación"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${Math.max(progress, stage === "processing" ? 100 : 0)}%` }} />
            </div>
            <p>{progressLabel}</p>
          </div>
        )}
        {result && (
          <p data-state="success">
            {formatSuccessMessage(result, successVariant)}
          </p>
        )}
        {errors.length > 0 && (
          <div data-state="error">
            <p>El archivo no se importo:</p>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
