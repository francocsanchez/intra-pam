"use client";

import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { EMPTY_SUBORIGIN_LABEL, type PreLeadRecord } from "@/lib/rendimiento-contract";

type Draft = {
  periodo: string;
  tipoRegistro: string;
  suborigen: string;
  total: string;
  presupuesto: string;
  gasto: string;
};

const EMPTY_DRAFT: Draft = {
  periodo: "",
  tipoRegistro: "",
  suborigen: "",
  total: "",
  presupuesto: "",
  gasto: "",
};

const currencyInputFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function PreLeadsManager({
  initialRecords,
  registryTypes,
  suborigenes,
}: {
  initialRecords: PreLeadRecord[];
  registryTypes: string[];
  suborigenes: string[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");

    return records.filter((record) => (
      `${record.periodo} ${record.tipoRegistro} ${record.suborigen ?? ""}`.toLocaleLowerCase("es-AR").includes(normalizedQuery)
    ));
  }, [query, records]);

  const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = await response.json().catch(() => null) as T | { error?: string } | null;
    if (!response.ok) {
      throw new Error(
        typeof data === "object" && data !== null && "error" in data
          ? data.error
          : "No se pudo completar la operación.",
      );
    }
    return data as T;
  };

  const run = (operation: () => Promise<void>) => {
    startTransition(() => {
      setMessage(null);
      operation().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "No se pudo completar la operación.");
      });
    });
  };

  const refresh = async () => {
    const nextRecords = await request<PreLeadRecord[]>("/api/pre-leads");
    setRecords(nextRecords);
  };

  function parseLocaleNumber(value: string) {
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    if (!normalized) return Number.NaN;
    return Number(normalized);
  }

  function formatLocaleNumber(value: string) {
    const numericValue = parseLocaleNumber(value);
    if (!Number.isFinite(numericValue)) return value;
    return currencyInputFormatter.format(numericValue);
  }

  function handleMaskedNumberChange(
    key: "presupuesto" | "gasto",
    value: string,
    target: "create" | "edit",
  ) {
    const sanitized = value.replace(/[^\d,]/g, "");
    const commaIndex = sanitized.indexOf(",");
    const normalized = commaIndex >= 0
      ? `${sanitized.slice(0, commaIndex + 1)}${sanitized.slice(commaIndex + 1).replace(/,/g, "")}`
      : sanitized;

    if (target === "create") {
      setDraft((current) => ({ ...current, [key]: normalized }));
      return;
    }

    setEditingDraft((current) => ({ ...current, [key]: normalized }));
  }

  function normalizeDraft(values: Draft) {
    return {
      periodo: values.periodo,
      tipoRegistro: values.tipoRegistro,
      suborigen: values.suborigen,
      total: Number(values.total),
      presupuesto: parseLocaleNumber(values.presupuesto),
      gasto: parseLocaleNumber(values.gasto),
    };
  }

  return (
    <div className="suborigins-layout">
      {message && <p className="suborigins-feedback" role="alert">{message}</p>}

      <section className="suborigins-panel" aria-labelledby="pre-leads-catalog-title">
        <div className="suborigins-panel__heading pre-leads-panel__heading">
          <div>
            <p className="section-kicker">Configuración / insumo manual</p>
            <h2 id="pre-leads-catalog-title">Pre Leads mensuales</h2>
          </div>

          <form
            className="pre-leads-create"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                await request<PreLeadRecord>("/api/pre-leads", {
                  method: "POST",
                  body: JSON.stringify(normalizeDraft(draft)),
                });
                setDraft(EMPTY_DRAFT);
                await refresh();
                setMessage("Registro de pre leads creado.");
              });
            }}
          >
            <input
              type="month"
              value={draft.periodo}
              onChange={(event) => setDraft((current) => ({ ...current, periodo: event.target.value }))}
              aria-label="Mes del pre lead"
              disabled={isPending}
            />
            <select
              value={draft.tipoRegistro}
              onChange={(event) => setDraft((current) => ({ ...current, tipoRegistro: event.target.value }))}
              aria-label="Tipo de registro"
              disabled={isPending}
            >
              <option value="">Seleccionar negocio</option>
              {registryTypes.map((registryType) => (
                <option key={registryType} value={registryType}>
                  {registryType}
                </option>
              ))}
            </select>
            <select
              value={draft.suborigen}
              onChange={(event) => setDraft((current) => ({ ...current, suborigen: event.target.value }))}
              aria-label="Suborigen"
              disabled={isPending}
            >
              <option value="">Seleccionar suborigen</option>
              {suborigenes.map((suborigen) => (
                <option key={suborigen} value={suborigen}>
                  {suborigen}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.total}
              onChange={(event) => setDraft((current) => ({ ...current, total: event.target.value }))}
              placeholder="Total"
              aria-label="Total de pre leads"
              disabled={isPending}
            />
            <input
              inputMode="decimal"
              value={draft.presupuesto}
              onChange={(event) => handleMaskedNumberChange("presupuesto", event.target.value, "create")}
              onBlur={(event) => setDraft((current) => ({ ...current, presupuesto: formatLocaleNumber(event.target.value) }))}
              placeholder="Presupuesto"
              aria-label="Presupuesto"
              disabled={isPending}
            />
            <input
              inputMode="decimal"
              value={draft.gasto}
              onChange={(event) => handleMaskedNumberChange("gasto", event.target.value, "create")}
              onBlur={(event) => setDraft((current) => ({ ...current, gasto: formatLocaleNumber(event.target.value) }))}
              placeholder="Gasto"
              aria-label="Gasto"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={
                isPending ||
                !draft.periodo ||
                !draft.tipoRegistro ||
                !draft.suborigen ||
                draft.total === "" ||
                draft.presupuesto === "" ||
                draft.gasto === ""
              }
            >
              <Plus aria-hidden="true" />
              Crear
            </button>
          </form>
        </div>

        <div className="pre-leads-toolbar">
          <label className="suborigin-search pre-leads-toolbar__search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por mes o negocio"
              aria-label="Buscar por mes o negocio"
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="suborigin-table pre-leads-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Tipo de registro</th>
                <th>Suborigen</th>
                <th>Total</th>
                <th>Presupuesto</th>
                <th>Gasto</th>
                <th>Actualizado</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isEditing = editingId === record.id;

                return (
                  <tr key={record.id}>
                    <td>
                      {isEditing ? (
                        <input
                          className="suborigin-inline-input"
                          type="month"
                          value={editingDraft.periodo}
                          onChange={(event) => setEditingDraft((current) => ({ ...current, periodo: event.target.value }))}
                          aria-label={`Editar mes de ${record.tipoRegistro}`}
                        />
                      ) : (
                        <strong>{record.periodo}</strong>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="suborigin-inline-input"
                          value={editingDraft.tipoRegistro}
                          onChange={(event) => setEditingDraft((current) => ({ ...current, tipoRegistro: event.target.value }))}
                          aria-label={`Editar tipo de registro de ${record.periodo}`}
                        >
                          {registryTypes.map((registryType) => (
                            <option key={registryType} value={registryType}>
                              {registryType}
                            </option>
                          ))}
                          {!registryTypes.includes(record.tipoRegistro) && (
                            <option value={record.tipoRegistro}>{record.tipoRegistro}</option>
                          )}
                        </select>
                      ) : (
                        record.tipoRegistro
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="suborigin-inline-input"
                          value={editingDraft.suborigen}
                          onChange={(event) => setEditingDraft((current) => ({ ...current, suborigen: event.target.value }))}
                          aria-label={`Editar suborigen de ${record.tipoRegistro}`}
                        >
                          {suborigenes.map((suborigen) => (
                            <option key={suborigen} value={suborigen}>
                              {suborigen}
                            </option>
                          ))}
                          {record.suborigen && !suborigenes.includes(record.suborigen) && (
                            <option value={record.suborigen}>{record.suborigen}</option>
                          )}
                        </select>
                      ) : (
                        record.suborigen ?? EMPTY_SUBORIGIN_LABEL
                      )}
                    </td>
                    <td className="pre-leads-table__number">
                      {isEditing ? (
                        <input
                          className="suborigin-inline-input"
                          type="number"
                          min={0}
                          step={1}
                          value={editingDraft.total}
                          onChange={(event) => setEditingDraft((current) => ({ ...current, total: event.target.value }))}
                          aria-label={`Editar total de ${record.tipoRegistro}`}
                        />
                      ) : (
                        record.total
                      )}
                    </td>
                    <td className="pre-leads-table__number">
                      {isEditing ? (
                        <input
                          className="suborigin-inline-input"
                          inputMode="decimal"
                          value={editingDraft.presupuesto}
                          onChange={(event) => handleMaskedNumberChange("presupuesto", event.target.value, "edit")}
                          onBlur={(event) => setEditingDraft((current) => ({ ...current, presupuesto: formatLocaleNumber(event.target.value) }))}
                          aria-label={`Editar presupuesto de ${record.tipoRegistro}`}
                        />
                      ) : (
                        record.presupuesto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      )}
                    </td>
                    <td className="pre-leads-table__number">
                      {isEditing ? (
                        <input
                          className="suborigin-inline-input"
                          inputMode="decimal"
                          value={editingDraft.gasto}
                          onChange={(event) => handleMaskedNumberChange("gasto", event.target.value, "edit")}
                          onBlur={(event) => setEditingDraft((current) => ({ ...current, gasto: formatLocaleNumber(event.target.value) }))}
                          aria-label={`Editar gasto de ${record.tipoRegistro}`}
                        />
                      ) : (
                        record.gasto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      )}
                    </td>
                    <td className="pre-leads-table__date">
                      {new Date(record.actualizadoEn).toLocaleDateString("es-AR")}
                    </td>
                    <td className="suborigin-actions">
                      {isEditing ? (
                        <button
                          title="Guardar"
                          disabled={isPending}
                          onClick={() => run(async () => {
                            await request(`/api/pre-leads/${record.id}`, {
                              method: "PUT",
                              body: JSON.stringify(normalizeDraft(editingDraft)),
                            });
                            setEditingId(null);
                            await refresh();
                            setMessage("Registro de pre leads actualizado.");
                          })}
                        >
                          <Check aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          title="Editar"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(record.id);
                            setEditingDraft({
                              periodo: record.periodo,
                              tipoRegistro: record.tipoRegistro,
                              suborigen: record.suborigen ?? "",
                              total: String(record.total),
                              presupuesto: currencyInputFormatter.format(record.presupuesto),
                              gasto: currencyInputFormatter.format(record.gasto),
                            });
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                      )}
                      <button
                        title="Eliminar"
                        disabled={isPending}
                        onClick={() => {
                          if (!window.confirm(`Eliminar el registro ${record.periodo} / ${record.tipoRegistro}?`)) {
                            return;
                          }

                          run(async () => {
                            await request(`/api/pre-leads/${record.id}`, { method: "DELETE" });
                            await refresh();
                            setMessage("Registro de pre leads eliminado.");
                          });
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredRecords.length && (
                <tr>
                  <td colSpan={8} className="suborigin-empty">
                    {records.length
                      ? "No hay resultados para esta búsqueda."
                      : "Cargue el primer total mensual para comenzar a medir la conversión."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
