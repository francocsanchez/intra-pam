"use client";

import { CalendarDays, ChevronDown, FileBarChart2, LoaderCircle } from "lucide-react";
import { Fragment, useLayoutEffect, useRef, useState, useTransition } from "react";

import {
  PamAnnualPreLeadChart,
  PamRegistryStackedBarChart,
} from "@/components/dashboard-chart";
import {
  type PamSummaryDashboard as PamSummaryDashboardData,
  getSafeRate,
} from "@/lib/rendimiento-contract";

type Props = {
  initialData: PamSummaryDashboardData;
};

const periodFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const rateFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPeriod(period: string | null) {
  if (!period) return "Sin período disponible";
  const [year, month] = period.split("-").map(Number);
  const label = periodFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function PamSummaryDashboard({ initialData }: Props) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const conversionPanelRef = useRef<HTMLElement>(null);
  const [breakdownHeight, setBreakdownHeight] = useState(0);
  const availableSuborigins = dashboard.suborigenes;
  const selectedSuborigins = dashboard.suborigenesSeleccionados;
  const conversionGroups = [...dashboard.conversionMensual.reduce(
    (groups, row) => {
      const rows = groups.get(row.suborigen) ?? [];
      rows.push(row);
      groups.set(row.suborigen, rows);
      return groups;
    },
    new Map<string, PamSummaryDashboardData["conversionMensual"]>(),
  )].map(([suborigen, rows]) => ({ suborigen, rows }));
  const conversionTotals = dashboard.conversionMensual.reduce(
    (totals, row) => ({
      leads: totals.leads + row.leads,
      ventas: totals.ventas + row.ventas,
    }),
    { leads: 0, ventas: 0 },
  );
  const monthlyTotal = dashboard.tiposRegistroMensual.reduce((total, item) => total + item.total, 0);

  useLayoutEffect(() => {
    const panel = conversionPanelRef.current;
    if (!panel) return;

    const updateBreakdownHeight = () => {
      const header = panel.querySelector<HTMLElement>(".dashboard-panel__heading");
      setBreakdownHeight(Math.max(0, panel.offsetHeight - (header?.offsetHeight ?? 0)));
    };

    const observer = new ResizeObserver(updateBreakdownHeight);
    observer.observe(panel);
    updateBreakdownHeight();
    return () => observer.disconnect();
  }, [dashboard.conversionMensual]);

  function toggleSuborigin(suborigin: string) {
    const nextSuborigins = selectedSuborigins.includes(suborigin)
      ? selectedSuborigins.filter((item) => item !== suborigin)
      : [...selectedSuborigins, suborigin].sort((left, right) => left.localeCompare(right, "es"));
    applyFilters(dashboard.periodoSeleccionado ?? "", nextSuborigins);
  }

  function toggleAllSuborigins() {
    applyFilters(
      dashboard.periodoSeleccionado ?? "",
      selectedSuborigins.length === availableSuborigins.length ? [] : availableSuborigins,
    );
  }

  function getSuboriginFilterLabel() {
    if (!availableSuborigins.length) return "Sin suborígenes";
    if (selectedSuborigins.length === availableSuborigins.length) return "Todos los suborígenes";
    if (!selectedSuborigins.length) return "Ningún suborigen";
    if (selectedSuborigins.length === 1) return selectedSuborigins[0] ?? "1 suborigen";
    return `${selectedSuborigins.length} suborígenes`;
  }

  function applyFilters(period: string, suborigins: string[]) {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ periodo: period });
        if (!suborigins.length) params.append("suborigen", "");
        for (const suborigin of suborigins) params.append("suborigen", suborigin);
        const response = await fetch(`/api/resumen?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error();

        const nextDashboard = (await response.json()) as PamSummaryDashboardData;
        setDashboard(nextDashboard);
        window.history.replaceState(null, "", `/resumen?${params}`);
      } catch {
        setError("No se pudo actualizar el período. Intente nuevamente.");
      }
    });
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-toolbar" aria-labelledby="pam-summary-title">
        <div>
          <p className="section-kicker">PAM / visión ejecutiva</p>
          <h1 id="pam-summary-title">Resumen</h1>
        </div>

        <div className="pam-summary-toolbar__filters">
          <details className="pam-summary-filter">
            <summary className="pam-summary-filter__trigger">
              <span>{getSuboriginFilterLabel()}</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="pam-summary-filter__menu">
              <label className="pam-summary-filter__option pam-summary-filter__option--all">
                <input type="checkbox" checked={availableSuborigins.length > 0 && selectedSuborigins.length === availableSuborigins.length} onChange={toggleAllSuborigins} disabled={isPending} />
                <span>Todos los suborígenes</span>
              </label>
              {availableSuborigins.map((suborigin) => (
                <label key={suborigin} className="pam-summary-filter__option">
                  <input type="checkbox" checked={selectedSuborigins.includes(suborigin)} onChange={() => toggleSuborigin(suborigin)} disabled={isPending} />
                  <span>{suborigin}</span>
                </label>
              ))}
            </div>
          </details>
          <label className="dashboard-period">
            <span><CalendarDays aria-hidden="true" /> Mes de referencia</span>
            <select value={dashboard.periodoSeleccionado ?? ""} onChange={(event) => applyFilters(event.target.value, selectedSuborigins)} disabled={!dashboard.periodos.length || isPending} aria-label="Filtrar resumen por mes y año">
              {!dashboard.periodos.length && <option value="">Sin períodos</option>}
              {dashboard.periodos.map((period) => <option key={period} value={period}>{formatPeriod(period)}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="dashboard-signal" aria-live="polite">
        <div>
          <span>Período activo</span>
          <strong>{formatPeriod(dashboard.periodoSeleccionado)}</strong>
        </div>
        <div className="dashboard-signal__rail" aria-hidden="true" />
        <div>
          <span>Año analizado</span>
          <strong>{isPending ? <LoaderCircle className="spin" aria-label="Actualizando" /> : dashboard.anioSeleccionado ?? "Sin año"}</strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      <section className="dashboard-grid dashboard-grid--pam" aria-label="Resumen mensual PAM">
        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Serie anual</span>
              <h2>Pre leads por tipo de registro</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.anioSeleccionado ?? "Sin año"}
            </span>
          </header>
          <PamAnnualPreLeadChart
            ariaLabel="Gráfico anual de pre leads por tipo de registro"
            data={dashboard.tendenciaAnualPreLeads}
          />
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--pam-secondary" aria-label="Distribución mensual PAM">
        <article className="dashboard-panel pam-summary-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Distribución mensual</span>
              <h2>Oportunidades por tipo de registro</h2>
            </div>
            <span className="dashboard-panel__count">{monthlyTotal} oportunidades</span>
          </header>
          <PamRegistryStackedBarChart
            ariaLabel="Gráfico de barras apiladas mensual de oportunidades por tipo de registro"
            data={dashboard.tiposRegistroMensual}
            emptyMessage="No hay oportunidades para este período"
            height={breakdownHeight}
          />
        </article>

        <article ref={conversionPanelRef} className="dashboard-panel dashboard-conversion pam-summary-conversion">
          <header className="dashboard-panel__heading">
            <div>
              <span>Conversión mensual</span>
              <h2>Leads y ventas por suborigen y negocio</h2>
            </div>
            <span className="dashboard-panel__count">
              {conversionTotals.ventas} ventas / {conversionTotals.leads} leads
            </span>
          </header>

          {conversionGroups.length ? (
            <div className="table-scroll">
              <table className="dashboard-conversion__table">
                <thead>
                  <tr>
                    <th scope="col">Suborigen</th>
                    <th scope="col">Negocio</th>
                    <th scope="col">Leads</th>
                    <th scope="col">Ventas</th>
                    <th scope="col">Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionGroups.map((group) => {
                    const subtotal = group.rows.reduce(
                      (totals, row) => ({
                        leads: totals.leads + row.leads,
                        ventas: totals.ventas + row.ventas,
                      }),
                      { leads: 0, ventas: 0 },
                    );

                    return (
                      <Fragment key={group.suborigen}>
                        {group.rows.map((row, index) => (
                          <tr key={`${group.suborigen}-${row.tipoRegistro}`}>
                            {index === 0 && (
                              <th
                                className="dashboard-conversion__origin"
                                scope="rowgroup"
                                rowSpan={group.rows.length + 1}
                              >
                                {group.suborigen}
                              </th>
                            )}
                            <td>{row.tipoRegistro}</td>
                            <td className="dashboard-conversion__number">{row.leads}</td>
                            <td className="dashboard-conversion__number">{row.ventas}</td>
                            <td className="dashboard-conversion__number">
                              {rateFormatter.format(getSafeRate(row.ventas, row.leads))}
                            </td>
                          </tr>
                        ))}
                        <tr className="dashboard-conversion__subtotal">
                          <th scope="row">Total</th>
                          <td className="dashboard-conversion__number">{subtotal.leads}</td>
                          <td className="dashboard-conversion__number">{subtotal.ventas}</td>
                          <td className="dashboard-conversion__number">
                            {rateFormatter.format(getSafeRate(subtotal.ventas, subtotal.leads))}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2} scope="row">Total general</th>
                    <td className="dashboard-conversion__number">{conversionTotals.leads}</td>
                    <td className="dashboard-conversion__number">{conversionTotals.ventas}</td>
                    <td className="dashboard-conversion__number">
                      {rateFormatter.format(getSafeRate(conversionTotals.ventas, conversionTotals.leads))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="dashboard-conversion__empty">
              No hay leads ni ventas para el período seleccionado.
            </div>
          )}
        </article>
      </section>

      {!dashboard.periodoSeleccionado && (
        <section className="dashboard-empty">
          <FileBarChart2 aria-hidden="true" />
          <div>
            <strong>No hay snapshots disponibles para PAM.</strong>
            <p>Importe oportunidades o cargue pre leads para habilitar el resumen mensual.</p>
          </div>
        </section>
      )}
    </main>
  );
}
