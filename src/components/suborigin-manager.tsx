"use client";

import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

type Suborigen = { id: string; nombre: string; activo: boolean; origenesAsociados: number; oportunidadesAsociadas: number };
type Origen = { origen: string; origenNormalizado: string; suborigenId: string | null; suborigenNombre: string | null; oportunidades: number };

export function SuboriginManager({ initialSuborigenes, initialOrigenes }: { initialSuborigenes: Suborigen[]; initialOrigenes: Origen[] }) {
  const [suborigenes, setSuborigenes] = useState(initialSuborigenes);
  const [origenes, setOrigenes] = useState(initialOrigenes);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => null) as T | { error?: string } | null;
    if (!response.ok) throw new Error(typeof data === "object" && data !== null && "error" in data ? data.error : "No se pudo completar la operacion.");
    return data as T;
  };
  const run = (operation: () => Promise<void>) => startTransition(() => { setMessage(null); operation().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No se pudo completar la operacion.")); });
  const refresh = async () => {
    const [nextSuborigenes, nextOrigenes] = await Promise.all([request<Suborigen[]>("/api/suborigenes-oportunidad"), request<Origen[]>("/api/origenes-oportunidad")]);
    setSuborigenes(nextSuborigenes); setOrigenes(nextOrigenes);
  };
  const visibleOrigenes = origenes.filter((item) =>
    (!pendingOnly || item.suborigenId === null) &&
    `${item.origen} ${item.suborigenNombre ?? ""}`.toLocaleLowerCase("es-AR").includes(query.trim().toLocaleLowerCase("es-AR")),
  );

  return (
    <div className="suborigins-layout">
      {message && <p className="suborigins-feedback" role="alert">{message}</p>}
      <section className="suborigins-panel" aria-labelledby="suborigins-catalog-title">
        <div className="suborigins-panel__heading">
          <div><p className="section-kicker">Catalogo operativo</p><h2 id="suborigins-catalog-title">Suborígenes</h2></div>
          <form className="suborigin-create" onSubmit={(event) => { event.preventDefault(); run(async () => { const item = await request<Suborigen>("/api/suborigenes-oportunidad", { method: "POST", body: JSON.stringify({ nombre: newName }) }); setSuborigenes((current) => [...current, item].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"))); setNewName(""); setMessage("Suborigen creado."); }); }}>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nuevo suborigen" aria-label="Nombre del nuevo suborigen" disabled={isPending} />
            <button type="submit" disabled={isPending || !newName.trim()}><Plus aria-hidden="true" /> Crear</button>
          </form>
        </div>
        <div className="table-scroll"><table className="suborigin-table"><thead><tr><th>Suborigen</th><th>Estado</th><th>Orígenes</th><th>Oportunidades</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>
          {suborigenes.map((item) => <tr key={item.id}>
            <td>{editingId === item.id ? <input className="suborigin-inline-input" value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Editar ${item.nombre}`} /> : <strong>{item.nombre}</strong>}</td>
            <td><button className="suborigin-state" data-active={item.activo ? "true" : "false"} disabled={isPending} onClick={() => run(async () => { await request(`/api/suborigenes-oportunidad/${item.id}`, { method: "PUT", body: JSON.stringify({ activo: !item.activo }) }); await refresh(); })}><span />{item.activo ? "Activo" : "Inactivo"}</button></td>
            <td>{item.origenesAsociados}</td><td>{item.oportunidadesAsociadas}</td>
            <td className="suborigin-actions">{editingId === item.id ? <button title="Guardar" disabled={isPending} onClick={() => run(async () => { await request(`/api/suborigenes-oportunidad/${item.id}`, { method: "PUT", body: JSON.stringify({ nombre: editingName }) }); setEditingId(null); await refresh(); })}><Check aria-hidden="true" /></button> : <button title="Editar" disabled={isPending} onClick={() => { setEditingId(item.id); setEditingName(item.nombre); }}><Pencil aria-hidden="true" /></button>}<button title="Eliminar" disabled={isPending || item.origenesAsociados > 0} onClick={() => { if (window.confirm(`Eliminar ${item.nombre}?`)) run(async () => { await request(`/api/suborigenes-oportunidad/${item.id}`, { method: "DELETE" }); await refresh(); }); }}><Trash2 aria-hidden="true" /></button></td>
          </tr>)}
          {!suborigenes.length && <tr><td colSpan={5} className="suborigin-empty">Cree el primer suborigen para comenzar a organizar los orígenes importados.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="suborigins-panel" aria-labelledby="origin-assignment-title">
        <div className="suborigins-panel__heading suborigins-panel__heading--assignments"><div><p className="section-kicker">Trazabilidad de importación</p><h2 id="origin-assignment-title">Asociación de orígenes</h2></div><div className="origin-filters"><label className="origin-filter"><span>Mostrar</span><select value={pendingOnly ? "pending" : "all"} onChange={(event) => setPendingOnly(event.target.value === "pending")}><option value="all">Todos los orígenes</option><option value="pending">Sin suborigen</option></select></label><label className="suborigin-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar origen o suborigen" /></label></div></div>
        <div className="table-scroll"><table className="origin-table"><thead><tr><th>Origen importado</th><th>Suborigen</th><th>Oportunidades</th></tr></thead><tbody>
          {visibleOrigenes.map((item) => <tr key={item.origenNormalizado}><td><strong>{item.origen}</strong><span>{item.origenNormalizado}</span></td><td><select value={item.suborigenId ?? ""} disabled={isPending} onChange={(event) => run(async () => { await request(`/api/origenes-oportunidad/${encodeURIComponent(item.origenNormalizado)}/suborigen`, { method: "PUT", body: JSON.stringify({ suborigenId: event.target.value || null }) }); await refresh(); setMessage(`Origen ${item.origen} actualizado.`); })}><option value="">Sin suborigen</option>{suborigenes.filter((suborigen) => suborigen.activo || suborigen.id === item.suborigenId).map((suborigen) => <option key={suborigen.id} value={suborigen.id}>{suborigen.nombre}{suborigen.activo ? "" : " (inactivo)"}</option>)}</select></td><td className="origin-count">{item.oportunidades}</td></tr>)}
          {!visibleOrigenes.length && <tr><td colSpan={3} className="suborigin-empty">{origenes.length ? pendingOnly ? "No hay orígenes pendientes de suborigen." : "No hay resultados para esta búsqueda." : "Los orígenes aparecerán después de importar oportunidades."}</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
