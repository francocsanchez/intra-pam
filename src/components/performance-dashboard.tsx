"use client";

import { Activity, ArrowDown, ArrowUp, CalendarDays, LoaderCircle, Minus } from "lucide-react";
import { useState, useTransition } from "react";

import { PerformanceFunnelChart } from "@/components/dashboard-chart";
import type { PerformanceDashboard as PerformanceDashboardData } from "@/lib/rendimiento-contract";

type Props = {
  initialData: PerformanceDashboardData;
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

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const FUNNEL_COLORS = ["#7ecb63", "#ff4d4f", "#ff9f43", "#7a7a7a", "#58a6a6", "#c9856b"];

function formatPeriod(period: string | null) {
  if (!period) return "Sin período disponible";
  const [year, month] = period.split("-").map(Number);
  const label = periodFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function renderVariation(variation: number | null) {
  if (variation === null) {
    return (
      <span className="performance-trend performance-trend--neutral">
        <Minus aria-hidden="true" />
        Sin base previa
      </span>
    );
  }

  if (variation <= 0) {
    return (
      <span className="performance-trend performance-trend--positive">
        <ArrowDown aria-hidden="true" />
        {rateFormatter.format(Math.abs(variation))}
      </span>
    );
  }

  return (
    <span className="performance-trend performance-trend--negative">
      <ArrowUp aria-hidden="true" />
      {rateFormatter.format(variation)}
    </span>
  );
}

export function PerformanceDashboard({ initialData }: Props) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const funnelMaxValue = (() => {
    const maxPreLeads = Math.max(...dashboard.negocios.map((metric) => metric.preLeads), 0);
    if (maxPreLeads > 0) return maxPreLeads;

    const maxLeads = Math.max(...dashboard.negocios.map((metric) => metric.leads), 0);
    if (maxLeads > 0) return maxLeads;

    return Math.max(...dashboard.negocios.map((metric) => metric.ventas), 1);
  })();

  function applyFilters(period: string, suborigen: string) {
    setError(null);
    startTransition(async () => {
      try {
        const searchParams = new URLSearchParams();
        searchParams.set("periodo", period);
        if (suborigen) {
          searchParams.set("suborigen", suborigen);
        }

        const response = await fetch(`/api/rendimiento?${searchParams.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();

        const nextDashboard = await response.json() as PerformanceDashboardData;
        setDashboard(nextDashboard);
        window.history.replaceState(null, "", `/rendimiento?${searchParams.toString()}`);
      } catch {
        setError("No se pudo actualizar el período. Intente nuevamente.");
      }
    });
  }

  return (
    <main className="performance-page">
      <section className="dashboard-toolbar" aria-labelledby="performance-title">
        <div>
          <p className="section-kicker">Panel comercial / conversión</p>
          <h1 id="performance-title">Rendimiento</h1>
        </div>

        <div className="performance-filters">
          <label className="dashboard-period">
            <span>Suborigen</span>
            <select
              value={dashboard.suborigenSeleccionado ?? ""}
              onChange={(event) => applyFilters(dashboard.periodoSeleccionado ?? "", event.target.value)}
              disabled={isPending}
              aria-label="Filtrar rendimiento por suborigen"
            >
              <option value="">Todos los suborígenes</option>
              {dashboard.suborigenes.map((suborigen) => (
                <option key={suborigen} value={suborigen}>
                  {suborigen}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-period">
            <span><CalendarDays aria-hidden="true" /> Ventana de observación</span>
            <select
              value={dashboard.periodoSeleccionado ?? ""}
              onChange={(event) => applyFilters(event.target.value, dashboard.suborigenSeleccionado ?? "")}
              disabled={!dashboard.periodos.length || isPending}
              aria-label="Filtrar rendimiento por mes y año"
            >
              {!dashboard.periodos.length && <option value="">Sin períodos</option>}
              {dashboard.periodos.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
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
          <span>Ventas cerradas</span>
          <strong>{isPending ? <LoaderCircle className="spin" aria-label="Actualizando" /> : dashboard.resumen.ventas}</strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      <section className="performance-summary" aria-label="Resumen total del período">
        <article className="dashboard-panel">
          <header className="dashboard-panel__heading">
            <div>
              <span>Total general</span>
              <h2>Embudo consolidado del período</h2>
            </div>
            <span className="dashboard-panel__count">
              {dashboard.resumen.preLeads} pre leads / {dashboard.resumen.leads} leads
            </span>
          </header>

          <div className="performance-summary__metrics">
            <div>
              <span>Pre Leads</span>
              <strong>{dashboard.resumen.preLeads}</strong>
            </div>
            <div>
              <span>Leads</span>
              <strong>{dashboard.resumen.leads}</strong>
            </div>
            <div>
              <span>Tasa conversión</span>
              <strong>{rateFormatter.format(dashboard.resumen.tasaConversion)}</strong>
            </div>
            <div>
              <span>Ventas</span>
              <strong>{dashboard.resumen.ventas}</strong>
            </div>
            <div>
              <span>Tasa cierre</span>
              <strong>{rateFormatter.format(dashboard.resumen.tasaCierre)}</strong>
            </div>
            <div>
              <span>Tasa pre leads</span>
              <strong>{rateFormatter.format(dashboard.resumen.tasaPreLeads)}</strong>
            </div>
            <div>
              <span>Presupuesto</span>
              <strong>{formatMoney(dashboard.resumen.presupuesto)}</strong>
            </div>
            <div>
              <span>Gasto</span>
              <strong>{formatMoney(dashboard.resumen.gasto)}</strong>
            </div>
            <div>
              <span>Costo por venta</span>
              <strong>{formatMoney(dashboard.resumen.costoPorVenta)}</strong>
            </div>
            <div className="performance-summary__comparison">
              <span>Vs mes anterior</span>
              <strong>{renderVariation(dashboard.resumen.variacionCostoPorVenta)}</strong>
              <small>
                {dashboard.resumen.periodoAnterior && dashboard.resumen.costoPorVentaAnterior !== null
                  ? `${formatPeriod(dashboard.resumen.periodoAnterior)} · ${formatMoney(dashboard.resumen.costoPorVentaAnterior)}`
                  : "Sin referencia"}
              </small>
            </div>
          </div>
        </article>
      </section>

      {dashboard.negocios.length ? (
        <section className="performance-grid" aria-label="Funnels por unidad de negocio">
          {dashboard.negocios.map((metric, index) => (
            <article key={metric.tipoRegistro} className="dashboard-panel performance-card">
              <header className="performance-card__heading">
                <span
                  className="performance-card__badge"
                  style={{ color: FUNNEL_COLORS[index % FUNNEL_COLORS.length], borderColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                >
                  {metric.tipoRegistro}
                </span>
              </header>

              <PerformanceFunnelChart
                ariaLabel={`Funnel de ${metric.tipoRegistro}: ${metric.preLeads} pre leads, ${metric.leads} leads y ${metric.ventas} ventas`}
                color={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                maxValue={funnelMaxValue}
                metric={metric}
              />

              <div className="performance-card__stats">
                <div><span>Pre Leads</span><strong>{metric.preLeads}</strong></div>
                <div><span>Leads</span><strong>{metric.leads}</strong></div>
                <div><span>Tasa conversión</span><strong>{rateFormatter.format(metric.tasaConversion)}</strong></div>
                <div><span>Ventas</span><strong>{metric.ventas}</strong></div>
                <div><span>Tasa cierre</span><strong>{rateFormatter.format(metric.tasaCierre)}</strong></div>
                <div><span>Tasa pre leads</span><strong>{rateFormatter.format(metric.tasaPreLeads)}</strong></div>
                <div><span>Presupuesto</span><strong>{formatMoney(metric.presupuesto)}</strong></div>
                <div><span>Gasto</span><strong>{formatMoney(metric.gasto)}</strong></div>
                <div><span>Costo por venta</span><strong>{formatMoney(metric.costoPorVenta)}</strong></div>
                <div className="performance-card__comparison">
                  <span>Vs mes anterior</span>
                  <strong>{renderVariation(metric.variacionCostoPorVenta)}</strong>
                  <small>
                    {metric.periodoAnterior && metric.costoPorVentaAnterior !== null
                      ? `${formatPeriod(metric.periodoAnterior)} · ${formatMoney(metric.costoPorVentaAnterior)}`
                      : "Sin referencia"}
                  </small>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="dashboard-empty performance-empty">
          <Activity aria-hidden="true" />
          <div>
            <strong>No hay datos para construir el funnel.</strong>
            <p>Cargue pre leads del mes o importe oportunidades para habilitar el análisis de rendimiento.</p>
          </div>
        </section>
      )}
    </main>
  );
}
