"use client";

import { BarChart3, CalendarDays, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { ClosingRateOwnerChart } from "@/components/dashboard-chart";
import type { ClosingRateDashboard as ClosingRateDashboardData } from "@/lib/rendimiento-contract";

type Props = {
  initialData: ClosingRateDashboardData;
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

export function ClosingRatesDashboard({ initialData }: Props) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyFilters(period: string, type: string, suborigin: string) {
    setError(null);
    startTransition(async () => {
      try {
        const searchParams = new URLSearchParams();
        searchParams.set("periodo", period);
        if (type) {
          searchParams.set("tipoRegistro", type);
        }
        if (suborigin) {
          searchParams.set("suborigen", suborigin);
        }

        const response = await fetch(`/api/tasas-cierre?${searchParams.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();

        const nextDashboard = await response.json() as ClosingRateDashboardData;
        setDashboard(nextDashboard);
        window.history.replaceState(null, "", `/tasas-cierre?${searchParams.toString()}`);
      } catch {
        setError("No se pudieron actualizar los filtros. Intente nuevamente.");
      }
    });
  }

  return (
    <main className="performance-page">
      <section className="dashboard-toolbar" aria-labelledby="closing-rates-title">
        <div>
          <p className="section-kicker">PAM / productividad comercial</p>
          <h1 id="closing-rates-title">Tasas de cierre</h1>
        </div>

        <div className="performance-filters closing-rates-filters">
          <label className="dashboard-period">
            <span>Suborigen</span>
            <select
              value={dashboard.suborigenSeleccionado ?? ""}
              onChange={(event) =>
                applyFilters(
                  dashboard.periodoSeleccionado ?? "",
                  dashboard.tipoRegistroSeleccionado ?? "",
                  event.target.value,
                )}
              disabled={isPending}
              aria-label="Filtrar tasas de cierre por suborigen"
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
            <span>Tipo de registro</span>
            <select
              value={dashboard.tipoRegistroSeleccionado ?? ""}
              onChange={(event) =>
                applyFilters(
                  dashboard.periodoSeleccionado ?? "",
                  event.target.value,
                  dashboard.suborigenSeleccionado ?? "",
                )}
              disabled={isPending}
              aria-label="Filtrar tasas de cierre por tipo de registro"
            >
              <option value="">Todos los negocios</option>
              {dashboard.tiposRegistro.map((tipoRegistro) => (
                <option key={tipoRegistro} value={tipoRegistro}>
                  {tipoRegistro}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-period">
            <span><CalendarDays aria-hidden="true" /> Mes de referencia</span>
            <select
              value={dashboard.periodoSeleccionado ?? ""}
              onChange={(event) =>
                applyFilters(
                  event.target.value,
                  dashboard.tipoRegistroSeleccionado ?? "",
                  dashboard.suborigenSeleccionado ?? "",
                )}
              disabled={!dashboard.periodos.length || isPending}
              aria-label="Filtrar tasas de cierre por mes y año"
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
          <span>Tasa consolidada</span>
          <strong>{isPending ? <LoaderCircle className="spin" aria-label="Actualizando" /> : rateFormatter.format(dashboard.resumen.tasaCierre)}</strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      <section className="closing-rates-summary" aria-label="Resumen de tasas de cierre">
        <article className="dashboard-panel closing-rates-summary__panel">
          <div className="closing-rates-summary__grid">
            <div>
              <span>Propietarios</span>
              <strong>{dashboard.resumen.propietarios}</strong>
            </div>
            <div>
              <span>Oportunidades</span>
              <strong>{dashboard.resumen.oportunidades}</strong>
            </div>
            <div>
              <span>Ventas</span>
              <strong>{dashboard.resumen.ventas}</strong>
            </div>
            <div>
              <span>Tasa de cierre</span>
              <strong>{rateFormatter.format(dashboard.resumen.tasaCierre)}</strong>
            </div>
          </div>
        </article>
      </section>

      {dashboard.propietarios.length ? (
        <section className="closing-rates-grid" aria-label="Tasas de cierre por propietario">
          <article className="dashboard-panel">
            <header className="dashboard-panel__heading">
              <div>
                <span>Comparativa mensual</span>
                <h2>Tasa de cierre por propietario</h2>
              </div>
              <span className="dashboard-panel__count">
                {dashboard.resumen.ventas} ventas / {dashboard.resumen.oportunidades} oportunidades
              </span>
            </header>

            <ClosingRateOwnerChart
              ariaLabel="Gráfico de tasas de cierre por propietario"
              data={dashboard.propietarios}
            />
          </article>
        </section>
      ) : (
        <section className="dashboard-empty performance-empty">
          <BarChart3 aria-hidden="true" />
          <div>
            <strong>No hay datos para construir la tasa de cierre.</strong>
            <p>Revise el período o ajuste los filtros de tipo de registro y suborigen.</p>
          </div>
        </section>
      )}
    </main>
  );
}
