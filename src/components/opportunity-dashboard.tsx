"use client";

import { CalendarDays, ChartNoAxesCombined, LoaderCircle } from "lucide-react";
import { Fragment, useState, useTransition } from "react";

import {
  DashboardChart,
  DashboardCategoryPieChart,
  DashboardOwnerChart,
  DashboardPieChart,
  DashboardTreemapChart,
  DashboardTrendChart,
} from "@/components/dashboard-chart";
import {
  reduceDashboardOwners,
  getLeadConversionRate,
  type OpportunityDashboard,
} from "@/lib/dashboard-contract";

type OpportunityDashboardProps = {
  initialData: OpportunityDashboard;
};

const COLLABORATION_COLORS = ["#4a7c62", "#a3a3a3"];

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

export function OpportunityDashboard({ initialData }: OpportunityDashboardProps) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const owners = reduceDashboardOwners(dashboard.porPropietario);
  const conversionGroups = [...dashboard.conversionPeriodo.reduce(
    (groups, row) => {
      const rows = groups.get(row.suborigen) ?? [];
      rows.push(row);
      groups.set(row.suborigen, rows);
      return groups;
    },
    new Map<string, OpportunityDashboard["conversionPeriodo"]>(),
  )].map(([suborigen, rows]) => ({ suborigen, rows }));
  const conversionTotals = dashboard.conversionPeriodo.reduce(
    (totals, row) => ({
      leads: totals.leads + row.leads,
      ventas: totals.ventas + row.ventas,
    }),
    { leads: 0, ventas: 0 },
  );

  function changePeriod(period: string) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/dashboard/oportunidades?periodo=${encodeURIComponent(period)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();

        const nextDashboard = (await response.json()) as OpportunityDashboard;
        setDashboard(nextDashboard);
        window.history.replaceState(null, "", `/?periodo=${encodeURIComponent(period)}`);
      } catch {
        setError("No se pudo actualizar el período. Intente nuevamente.");
      }
    });
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-toolbar" aria-labelledby="dashboard-title">
        <div>
          <p className="section-kicker">Panel central / oportunidades</p>
          <h1 id="dashboard-title">Dashboard</h1>
        </div>

        <label className="dashboard-period">
          <span><CalendarDays aria-hidden="true" /> Ventana de observación</span>
          <select
            value={dashboard.periodoSeleccionado ?? ""}
            onChange={(event) => changePeriod(event.target.value)}
            disabled={!dashboard.periodos.length || isPending}
            aria-label="Filtrar por mes y año de creación"
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
          <span>Oportunidades creadas</span>
          <strong>{isPending ? <LoaderCircle className="spin" aria-label="Actualizando" /> : dashboard.total}</strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      <section className="dashboard-grid dashboard-grid--global" aria-label="Métricas globales de oportunidades">
        <article className="dashboard-panel dashboard-panel--status">
          <header className="dashboard-panel__heading">
            <div>
              <span>Cartera total</span>
              <h2>Oportunidades abiertas y cerradas</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.estadoGlobal.abiertas + dashboard.estadoGlobal.cerradas} total
            </span>
          </header>
          <DashboardPieChart
            abiertas={dashboard.estadoGlobal.abiertas}
            cerradas={dashboard.estadoGlobal.cerradas}
          />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Oportunidades históricas</span>
              <h2>Oportunidades por mes: ingresos y estado</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.tendenciaMensual.length} meses
            </span>
          </header>
          <DashboardTrendChart data={dashboard.tendenciaMensual} />
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--suborigins" aria-label="Clasificaciones históricas de oportunidades">
        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Participación histórica</span>
              <h2>Oportunidades colaboradas</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.colaboracionGlobal.reduce(
                (total, item) => total + item.total,
                0,
              )} total
            </span>
          </header>
          <DashboardCategoryPieChart
            ariaLabel="Gráfico de pie global de oportunidades colaboradas y no colaboradas"
            colors={COLLABORATION_COLORS}
            data={dashboard.colaboracionGlobal}
            emptyMessage="No hay oportunidades para analizar"
          />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Distribución histórica</span>
              <h2>Oportunidades por tipo de registro</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.tiposRegistroGlobal.length} tipos
            </span>
          </header>
          <DashboardCategoryPieChart
            ariaLabel="Gráfico de pie global de oportunidades por tipo de registro"
            data={dashboard.tiposRegistroGlobal}
            emptyMessage="No hay tipos de registro"
          />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Clasificación histórica</span>
              <h2>Oportunidades por suborigen</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.suborigenesGlobal.length} suborígenes
            </span>
          </header>
          <DashboardTreemapChart
            ariaLabel="Treemap global de oportunidades por suborigen"
            data={dashboard.suborigenesGlobal}
            emptyMessage="No hay oportunidades para clasificar"
          />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Clasificación del período activo</span>
              <h2>Suborígenes del mes seleccionado</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.suborigenesPeriodo.length} suborígenes
            </span>
          </header>
          <DashboardTreemapChart
            ariaLabel="Treemap de oportunidades por suborigen del período seleccionado"
            data={dashboard.suborigenesPeriodo}
            emptyMessage="No hay suborígenes para este período"
          />
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--filtered" aria-label="Métricas filtradas de oportunidades">
        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Distribución</span>
              <h2>Oportunidades por etapa</h2>
            </div>
            <span className="dashboard-panel__count">{dashboard.porEtapa.length} etapas</span>
          </header>
          <DashboardChart
            ariaLabel="Gráfico de oportunidades por etapa"
            data={dashboard.porEtapa}
            emptyMessage="No hay etapas para este período"
          />
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Responsables</span>
              <h2>Oportunidades por propietario</h2>
            </div>
            <span className="dashboard-panel__count">{dashboard.porPropietario.length} propietarios</span>
          </header>
          <DashboardOwnerChart data={owners} />
        </article>
      </section>

      <section className="dashboard-panel dashboard-conversion" aria-labelledby="dashboard-conversion-title">
        <header className="dashboard-panel__heading">
          <div>
            <span>Rendimiento del período activo</span>
            <h2 id="dashboard-conversion-title">Leads y ventas por suborigen y negocio</h2>
          </div>
          <span className="dashboard-panel__count">
            {conversionTotals.ventas} ventas / {conversionTotals.leads} leads
          </span>
        </header>

        {conversionGroups.length > 0 ? (
          <div className="table-scroll">
            <table className="dashboard-conversion__table">
              <thead>
                <tr>
                  <th scope="col">Origen resumido</th>
                  <th scope="col">Negocio</th>
                  <th scope="col">Leads</th>
                  <th scope="col">Ventas</th>
                  <th scope="col">Tasa leads</th>
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
                            {rateFormatter.format(getLeadConversionRate(row.leads, row.ventas))}
                          </td>
                        </tr>
                      ))}
                      <tr className="dashboard-conversion__subtotal">
                        <th scope="row">Total</th>
                        <td className="dashboard-conversion__number">{subtotal.leads}</td>
                        <td className="dashboard-conversion__number">{subtotal.ventas}</td>
                        <td className="dashboard-conversion__number">
                          {rateFormatter.format(getLeadConversionRate(subtotal.leads, subtotal.ventas))}
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
                    {rateFormatter.format(
                      getLeadConversionRate(conversionTotals.leads, conversionTotals.ventas),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="dashboard-conversion__empty">
            No hay oportunidades para el período seleccionado.
          </div>
        )}
      </section>

      {!dashboard.periodoSeleccionado && (
        <section className="dashboard-empty">
          <ChartNoAxesCombined aria-hidden="true" />
          <div>
            <strong>No hay oportunidades con fecha de creación.</strong>
            <p>Importe un archivo de oportunidades para habilitar las métricas mensuales.</p>
          </div>
        </section>
      )}
    </main>
  );
}
