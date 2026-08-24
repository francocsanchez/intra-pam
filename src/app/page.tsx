import { ArrowRight, Database, RefreshCw, Server } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import {
  getDatabaseHealth,
  type DatabaseStatus,
} from "@/lib/database-health";

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusCard({ service }: { service: DatabaseStatus }) {
  const Icon = service.id === "mongodb" ? Database : Server;

  return (
    <article
      className="status-card"
      data-connected={service.connected ? "true" : "false"}
    >
      <div className="status-card__heading">
        <div className="status-card__icon" aria-hidden="true">
          <Icon strokeWidth={1.65} />
        </div>
        <div>
          <p className="status-card__engine">{service.name}</p>
          <p className="status-card__database">{service.database}</p>
        </div>
      </div>

      <div className="status-card__signal">
        <span className="status-dot" aria-hidden="true" />
        <span>{service.connected ? "Conectado" : "Sin conexion"}</span>
      </div>

      <dl className="status-card__details">
        <div>
          <dt>Permisos</dt>
          <dd>{service.mode}</dd>
        </div>
        <div>
          <dt>Respuesta</dt>
          <dd>{service.latencyMs} ms</dd>
        </div>
      </dl>

      <p className="sr-only">{service.message}</p>
    </article>
  );
}

export default async function Home() {
  await connection();
  const health = await getDatabaseHealth();
  const connectedCount = health.services.filter(
    (service) => service.connected,
  ).length;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Intra PAM, inicio">
          <span className="brand__mark">IP</span>
          <span>Intra PAM</span>
        </a>
        <span className="stage-label">Etapa 01 / Conectividad</span>
      </header>

      <section className="hero" id="top">
        <div className="hero__copy">
          <p className="eyebrow">Infraestructura de datos</p>
          <h1>
            Dos fuentes.
            <br />
            Una señal clara.
          </h1>
          <p className="hero__description">
            Estado en tiempo real de los motores que alimentan el analisis de
            informacion de Intra PAM.
          </p>
        </div>

        <div
          className="health-summary"
          data-healthy={health.healthy ? "true" : "false"}
        >
          <div className="health-summary__signal" aria-hidden="true">
            <span className="health-summary__pulse" />
            <span className="health-summary__line" />
            <ArrowRight strokeWidth={1.5} />
          </div>
          <p className="health-summary__value">
            {connectedCount}
            <span>/{health.services.length}</span>
          </p>
          <div>
            <p className="health-summary__label">
              {health.healthy
                ? "Todos los sistemas operativos"
                : "Hay conexiones pendientes"}
            </p>
            <p className="health-summary__time">
              Verificado {formatCheckedAt(health.checkedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="connections" aria-labelledby="connections-title">
        <div className="section-heading">
          <h2 id="connections-title">Conexiones activas</h2>
          <Link className="refresh-link" href="/">
            <RefreshCw aria-hidden="true" />
            Volver a comprobar
          </Link>
        </div>

        <div className="signal-rail" aria-hidden="true">
          <span data-active={health.services[0]?.connected} />
          <span data-active={health.healthy} />
          <span data-active={health.services[1]?.connected} />
        </div>

        <div className="status-grid">
          {health.services.map((service) => (
            <StatusCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      <footer className="dashboard-footer">
        <p>Sin autenticacion en esta etapa</p>
        <Link href="/api/health">Consultar endpoint de salud</Link>
      </footer>
    </main>
  );
}
