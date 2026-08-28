"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  OWNER_CLASSIFICATION_GROUPS,
  type OpportunityOwnerGroup,
} from "@/lib/propietario-clasificacion-contract";

type OwnerClassification = {
  nombre: string;
  clave: string;
  oportunidades: number;
  vendedorCodigo: number | null;
  grupo: OpportunityOwnerGroup;
};

export function OwnerClassificationManager({
  initialOwners,
}: {
  initialOwners: OwnerClassification[];
}) {
  const [owners, setOwners] = useState(initialOwners);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleOwners = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");

    if (!normalizedQuery) {
      return owners;
    }

    return owners.filter((owner) =>
      `${owner.nombre} ${owner.vendedorCodigo ?? ""} ${owner.grupo}`
        .toLocaleLowerCase("es-AR")
        .includes(normalizedQuery),
    );
  }, [owners, query]);

  function updateGroup(ownerKey: string, nextGroup: OpportunityOwnerGroup) {
    const previousOwners = owners;

    setOwners((current) =>
      current.map((owner) =>
        owner.clave === ownerKey ? { ...owner, grupo: nextGroup } : owner,
      ),
    );
    setPendingKey(ownerKey);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/clasificaciones-propietario-oportunidad/${encodeURIComponent(ownerKey)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grupo: nextGroup }),
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo guardar la clasificación.");
        }

        setMessage("Clasificación actualizada.");
      } catch (error) {
        setOwners(previousOwners);
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la clasificación.",
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <>
      {message && (
        <p
          className={
            message === "Clasificación actualizada."
              ? "owners-feedback owners-feedback--success"
              : "owners-feedback"
          }
          role="status"
        >
          {message}
        </p>
      )}

      <section className="seller-table-shell" aria-label="Clasificación de propietarios">
        <div className="owners-toolbar">
          <div>
            <p className="section-kicker">MongoDB / clasificación manual</p>
            <h2>Propietarios detectados</h2>
          </div>

          <label className="search-form owners-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar propietarios</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por propietario, grupo o vendedor"
              aria-label="Buscar propietarios"
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="seller-table owners-table">
            <thead>
              <tr>
                <th scope="col">Propietario</th>
                <th scope="col">Grupo</th>
                <th scope="col">Oportunidades</th>
                <th scope="col">Vendedor asociado</th>
              </tr>
            </thead>
            <tbody>
              {visibleOwners.map((owner) => (
                <tr key={owner.clave}>
                  <td>
                    <strong className="seller-name">{owner.nombre}</strong>
                    <span className="owners-table__key">{owner.clave}</span>
                  </td>
                  <td>
                    <div className="owner-assignment owner-assignment--classification">
                      <select
                        aria-label={`Grupo del propietario ${owner.nombre}`}
                        value={owner.grupo}
                        disabled={isPending && pendingKey === owner.clave}
                        onChange={(event) =>
                          updateGroup(
                            owner.clave,
                            event.target.value as OpportunityOwnerGroup,
                          )
                        }
                      >
                        {OWNER_CLASSIFICATION_GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                      {isPending && pendingKey === owner.clave && (
                        <LoaderCircle className="spin" aria-label="Guardando" />
                      )}
                    </div>
                  </td>
                  <td className="seller-code">{owner.oportunidades}</td>
                  <td>
                    {owner.vendedorCodigo !== null ? (
                      <span className="owners-table__seller">
                        <span aria-hidden="true" />
                        Vendedor #{owner.vendedorCodigo}
                      </span>
                    ) : (
                      <span className="branch-code">Sin asociación</span>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleOwners.length && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    {owners.length
                      ? "No hay propietarios que coincidan con la búsqueda."
                      : "Los propietarios aparecerán después de importar oportunidades."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
