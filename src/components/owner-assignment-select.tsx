"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type OwnerOption = {
  nombre: string;
  vendedorCodigo: number | null;
};

export function OwnerAssignmentSelect({
  sellerCode,
  currentOwner,
  owners,
}: {
  sellerCode: number;
  currentOwner: string | null;
  owners: OwnerOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentOwner ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveOwner(nextValue: string, replaceExisting = false) {
    return fetch(`/api/vendedores/${sellerCode}/propietario-oportunidad`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propietario: nextValue || null,
        reemplazar: replaceExisting,
      }),
    });
  }

  async function updateOwner(nextValue: string) {
    const previousValue = value;
    setValue(nextValue);
    setSaving(true);
    setError("");

    try {
      let response = await saveOwner(nextValue);
      let payload = (await response.json()) as {
        error?: string;
        requiereConfirmacion?: boolean;
      };

      if (response.status === 409 && payload.requiereConfirmacion) {
        const confirmed = window.confirm(
          `${payload.error ?? "La asociacion seleccionada ya esta en uso."}\n\n` +
            "¿Queres reemplazar la asociacion existente? Las oportunidades se actualizaran automaticamente.",
        );

        if (!confirmed) {
          setValue(previousValue);
          return;
        }

        response = await saveOwner(nextValue, true);
        payload = (await response.json()) as { error?: string };
      }

      if (!response.ok) {
        setValue(previousValue);
        setError(payload.error ?? "No se pudo guardar.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setValue(previousValue);
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="owner-assignment">
      <select
        aria-label={`Propietario de oportunidad para vendedor ${sellerCode}`}
        value={value}
        disabled={saving || owners.length === 0}
        onChange={(event) => updateOwner(event.target.value)}
      >
        <option value="">
          {owners.length === 0 ? "Importe oportunidades" : "Sin asignar"}
        </option>
        {owners.map((owner) => (
          <option value={owner.nombre} key={owner.nombre}>
            {owner.nombre}
            {owner.vendedorCodigo !== null &&
            owner.vendedorCodigo !== sellerCode
              ? ` - vendedor #${owner.vendedorCodigo}`
              : ""}
          </option>
        ))}
      </select>
      {saving && <LoaderCircle className="spin" aria-label="Guardando" />}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
