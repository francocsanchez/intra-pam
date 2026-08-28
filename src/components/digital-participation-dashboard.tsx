"use client";

import { CalendarDays, LoaderCircle, MonitorCog, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";

import { PamDigitalParticipationChart } from "@/components/dashboard-chart";
import type { PamSummaryDashboard as PamSummaryDashboardData } from "@/lib/rendimiento-contract";

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

export function DigitalParticipationDashboard({ initialData }: Props) {
  const [dashboard, setDashboard] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasData = dashboard.resumenParticipacionDigital.length > 0;

  function changePeriod(period: string) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/participacion-digital?periodo=${encodeURIComponent(period)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();

        const nextDashboard = (await response.json()) as PamSummaryDashboardData;
        setDashboard(nextDashboard);
        window.history.replaceState(
          null,
          "",
          `/participacion-digital?periodo=${encodeURIComponent(period)}`,
        );
      } catch {
        setError("No se pudo actualizar el período. Intente nuevamente.");
      }
    });
  }

  return (
    <main className="performance-page">
      <section className="dashboard-toolbar" aria-labelledby="digital-participation-title">
        <div>
          <p className="section-kicker">PAM / participación comercial</p>
          <h1 id="digital-participation-title">Participación Digital</h1>
        </div>

        <label className="dashboard-period">
          <span><CalendarDays aria-hidden="true" /> Mes de referencia</span>
          <select
            value={dashboard.periodoSeleccionado ?? ""}
            onChange={(event) => changePeriod(event.target.value)}
            disabled={!dashboard.periodos.length || isPending}
            aria-label="Filtrar participación digital por mes y año"
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
          <strong>
            {isPending ? (
              <LoaderCircle className="spin" aria-label="Actualizando" />
            ) : (
              dashboard.anioSeleccionado ?? "Sin año"
            )}
          </strong>
        </div>
      </section>

      {error && <p className="dashboard-feedback" role="alert">{error}</p>}

      <section className="closing-rates-summary" aria-label="Resumen anual de participación digital">
        <article className="dashboard-panel closing-rates-summary__panel">
          <div className="closing-rates-summary__grid digital-participation-summary__grid">
            {dashboard.resumenParticipacionDigital.map((item) => (
              <div key={item.tipoRegistro}>
                <span>{item.tipoRegistro}</span>
                <strong>{rateFormatter.format(item.participacion)}</strong>
                <small>
                  {item.ventasColaboradas} colaboradas / {item.ventasTotales} ventas
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {hasData ? (
        <section className="closing-rates-grid" aria-label="Participación digital anualizada">
          <article className="dashboard-panel">
            <header className="dashboard-panel__heading">
              <div>
                <span>Serie anual</span>
                <h2>Participación digital por tipo de registro</h2>
              </div>
              <span className="dashboard-panel__count">
                <MonitorCog aria-hidden="true" /> {dashboard.resumenParticipacionDigital.length} negocios
              </span>
            </header>

            <PamDigitalParticipationChart
              ariaLabel="Gráfico anual de participación digital"
              data={dashboard.tendenciaAnualParticipacionDigital}
            />
          </article>
        </section>
      ) : (
        <section className="dashboard-empty performance-empty">
          <TrendingUp aria-hidden="true" />
          <div>
            <strong>No hay datos para construir la participación digital.</strong>
            <p>Importe oportunidades con fechas válidas y sincronice el archivo de colaboradores.</p>
          </div>
        </section>
      )}
    </main>
  );
}
