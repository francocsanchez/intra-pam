"use client";

import { CalendarDays, ChevronDown, FileBarChart2, LoaderCircle } from "lucide-react";
import { Fragment, useState, useTransition } from "react";

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
  const availableSuborigins = [...new Set(
    dashboard.conversionMensual.map((row) => row.suborigen),
  )].sort((left, right) => left.localeCompare(right, "es"));
  const [selectedSuborigins, setSelectedSuborigins] = useState<string[]>(availableSuborigins);
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
  const filteredMonthlyTypes = [...dashboard.conversionMensual.reduce(
    (groups, row) => {
      if (!selectedSuborigins.includes(row.suborigen)) {
        return groups;
      }

      groups.set(row.tipoRegistro, (groups.get(row.tipoRegistro) ?? 0) + row.leads);
      return groups;
    },
    new Map<string, number>(),
  )]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((left, right) => right.total - left.total || left.nombre.localeCompare(right.nombre, "es"));
  const filteredMonthlyTotal = filteredMonthlyTypes.reduce((total, item) => total + item.total, 0);

  function toggleSuborigin(suborigin: string) {
    setSelectedSuborigins((current) =>
      current.includes(suborigin)
        ? current.filter((item) => item !== suborigin)
        : [...current, suborigin].sort((left, right) => left.localeCompare(right, "es")),
    );
  }

  function toggleAllSuborigins() {
    setSelectedSuborigins((current) =>
      current.length === availableSuborigins.length ? [] : availableSuborigins,
    );
  }

  function getSuboriginFilterLabel() {
    if (!availableSuborigins.length) return "Sin suborígenes";
    if (selectedSuborigins.length === availableSuborigins.length) return "Todos los suborígenes";
    if (!selectedSuborigins.length) return "Ningún suborigen";
    if (selectedSuborigins.length === 1) return selectedSuborigins[0] ?? "1 suborigen";
    return `${selectedSuborigins.length} suborígenes`;
  }

  function changePeriod(period: string) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/resumen?periodo=${encodeURIComponent(period)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();

        const nextDashboard = (await response.json()) as PamSummaryDashboardData;
        setDashboard(nextDashboard);
        setSelectedSuborigins(
          [...new Set(nextDashboard.conversionMensual.map((row) => row.suborigen))]
            .sort((left, right) => left.localeCompare(right, "es")),
        );
        window.history.replaceState(null, "", `/resumen?periodo=${encodeURIComponent(period)}`);
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

        <label className="dashboard-period">
          <span><CalendarDays aria-hidden="true" /> Mes de referencia</span>
          <select
            value={dashboard.periodoSeleccionado ?? ""}
            onChange={(event) => changePeriod(event.target.value)}
            disabled={!dashboard.periodos.length || isPending}
            aria-label="Filtrar resumen por mes y año"
          >
            {!dashboard.periodos.length && <option value="">Sin períodos</option>}
            {dashboard.periodos.map((period) => (
              <option key={period} value={period}>
                {formatPeriod(period)}
              </option>
            ))}
          </select>
        </label>
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
            <div className="pam-summary-panel__actions">
              <details className="pam-summary-filter">
                <summary className="pam-summary-filter__trigger">
                  <span>{getSuboriginFilterLabel()}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div className="pam-summary-filter__menu">
                  <label className="pam-summary-filter__option pam-summary-filter__option--all">
                    <input
                      type="checkbox"
                      checked={
                        availableSuborigins.length > 0 &&
                        selectedSuborigins.length === availableSuborigins.length
                      }
                      onChange={toggleAllSuborigins}
                    />
                    <span>Todos los suborígenes</span>
                  </label>
                  {availableSuborigins.map((suborigin) => (
                    <label key={suborigin} className="pam-summary-filter__option">
                      <input
                        type="checkbox"
                        checked={selectedSuborigins.includes(suborigin)}
                        onChange={() => toggleSuborigin(suborigin)}
                      />
                      <span>{suborigin}</span>
                    </label>
                  ))}
                </div>
              </details>
              <span className="dashboard-panel__count">
                {filteredMonthlyTotal} oportunidades
              </span>
            </div>
          </header>
          <PamRegistryStackedBarChart
            ariaLabel="Gráfico de barras apiladas mensual de oportunidades por tipo de registro"
            data={filteredMonthlyTypes}
            emptyMessage="No hay oportunidades para este período"
          />
        </article>

        <article className="dashboard-panel dashboard-conversion pam-summary-conversion">
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
