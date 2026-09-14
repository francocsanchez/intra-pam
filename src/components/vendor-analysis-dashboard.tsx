"use client";

import { BarChart3, CalendarDays, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import {
  VendorFamiliesRadarChart,
  VendorFamiliesTreeChart,
  VendorOperationsLineChart,
} from "@/components/dashboard-chart";
import type { VendorAnalysisDashboard as VendorAnalysisDashboardData } from "@/lib/vendedor-analisis-contract";

type Props = {
  initialData: VendorAnalysisDashboardData;
};

const periodFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  timeZone: "UTC",
});

function formatPeriod(period: string | null): string {
  if (!period) return "Sin períodos disponibles";
  const [year, month] = period.split("-").map(Number);
  const label = periodFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatShortMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return shortMonthFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
}

export function VendorAnalysisDashboard({ initialData }: Props) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyPeriod(period: string) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/vendedores/${dashboard.vendedor.codigo}/analisis?periodo=${encodeURIComponent(period)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();

        const nextDashboard = await response.json() as VendorAnalysisDashboardData;
        setDashboard(nextDashboard);
        window.history.replaceState(
          null,
          "",
          `/vendedores/${dashboard.vendedor.codigo}/analisis?periodo=${encodeURIComponent(period)}`,
        );
      } catch {
        setError("No se pudo actualizar el período. Intente nuevamente.");
      }
    });
  }

  const annualTotal = dashboard.operacionesAnuales.reduce((total, point) => total + point.total, 0);
  const monthlyTotal = dashboard.operacionesDiarias.reduce((total, point) => total + point.total, 0);

  return (
    <main className="vendor-analysis-page">
      <section className="dashboard-toolbar" aria-labelledby="vendor-analysis-title">
        <div>
          <p className="section-kicker">SQL Server / actividad comercial</p>
          <h1 id="vendor-analysis-title">{dashboard.vendedor.nombre}</h1>
        </div>

        <label className="dashboard-period">
          <span><CalendarDays aria-hidden="true" /> Mes de análisis</span>
          <select
            value={dashboard.periodoSeleccionado ?? ""}
            onChange={(event) => applyPeriod(event.target.value)}
            disabled={!dashboard.periodos.length || isPending}
            aria-label="Seleccionar mes de análisis"
          >
            {!dashboard.periodos.length && <option value="">Sin períodos</option>}
            {dashboard.periodos.map((period) => (
              <option key={period} value={period}>{formatPeriod(period)}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="dashboard-signal" aria-live="polite">
        <div>
          <span>Sucursal vigente</span>
          <strong>{dashboard.vendedor.sucursalNombre ?? "Sin sucursal asociada"}</strong>
        </div>
        <div className="dashboard-signal__rail" aria-hidden="true" />
        <div>
          <span>{dashboard.periodoSeleccionado ? "Operaciones del mes" : "Operaciones del año"}</span>
          <strong>{isPending ? <LoaderCircle className="spin" aria-label="Actualizando" /> : dashboard.periodoSeleccionado ? monthlyTotal : annualTotal}</strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      {dashboard.periodoSeleccionado ? (
        <>
          <section className="vendor-analysis-grid vendor-analysis-grid--annual" aria-label="Operaciones anuales">
            <article className="dashboard-panel">
              <header className="dashboard-panel__heading">
                <div>
                  <span>Serie anual</span>
                  <h2>Operaciones realizadas en {dashboard.periodoSeleccionado.slice(0, 4)}</h2>
                </div>
                <span className="dashboard-panel__count">{annualTotal} operaciones</span>
              </header>
              <VendorOperationsLineChart
                ariaLabel="Gráfico de línea de operaciones realizadas durante el año"
                data={dashboard.operacionesAnuales}
                emptyMessage="No hay operaciones para el año seleccionado"
                labelFormatter={(point) => "periodo" in point ? formatShortMonth(point.periodo) : String(point.dia)}
                closingRates={dashboard.tasaCierreAnual}
              />
            </article>

            <article className="dashboard-panel">
              <header className="dashboard-panel__heading">
                <div>
                  <span>Jerarquía anual</span>
                  <h2>Operaciones por familia</h2>
                </div>
                <span className="dashboard-panel__count">{dashboard.operacionesAnualesPorFamilia.length} familias</span>
              </header>
              <VendorFamiliesTreeChart
                ariaLabel="Gráfico de árbol de operaciones anuales por familia de auto"
                data={dashboard.operacionesAnualesPorFamilia}
              />
            </article>
          </section>

          <section className="vendor-analysis-grid vendor-analysis-grid--monthly" aria-label="Detalle mensual de operaciones">
            <article className="dashboard-panel">
              <header className="dashboard-panel__heading">
                <div>
                  <span>Distribución mensual</span>
                  <h2>Operaciones por familia</h2>
                </div>
                <span className="dashboard-panel__count">{monthlyTotal} operaciones</span>
              </header>
              <VendorFamiliesRadarChart
                ariaLabel="Gráfico radar de operaciones por familia de auto"
                data={dashboard.operacionesPorFamilia}
              />
            </article>

            <article className="dashboard-panel">
              <header className="dashboard-panel__heading">
                <div>
                  <span>Ritmo diario</span>
                  <h2>Operaciones diarias</h2>
                </div>
                <span className="dashboard-panel__count">{formatPeriod(dashboard.periodoSeleccionado)}</span>
              </header>
              <VendorOperationsLineChart
                ariaLabel="Gráfico de línea de operaciones diarias del mes"
                data={dashboard.operacionesDiarias}
                emptyMessage="No hay operaciones para el mes seleccionado"
                labelFormatter={(point) => String("dia" in point ? point.dia : point.periodo)}
              />
            </article>
          </section>
        </>
      ) : (
        <section className="dashboard-empty performance-empty">
          <BarChart3 aria-hidden="true" />
          <div>
            <strong>Este vendedor todavía no registra operaciones.</strong>
            <p>El tablero se habilitará cuando existan operaciones con fecha asignada.</p>
          </div>
        </section>
      )}
    </main>
  );
}
