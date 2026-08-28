import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { OpportunityImport } from "@/components/opportunity-import";
import {
  getOpportunityOwners,
  getOpportunitySummary,
} from "@/lib/oportunidades";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatImportDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function OpportunitiesPage() {
  await connection();
  const [summary, owners] = await Promise.all([
    getOpportunitySummary(),
    getOpportunityOwners(),
  ]);
  const pendingOwners = owners.filter(
    (owner) => owner.vendedorCodigo === null,
  );

  return (
    <main className="opportunities-page">
      <section className="opportunities-toolbar" aria-labelledby="opportunities-title">
        <div>
          <p className="section-kicker">MongoDB / Importacion incremental</p>
          <h1 id="opportunities-title">Oportunidades</h1>
        </div>
        <div className="opportunities-imports">
          <OpportunityImport
            endpoint="/api/oportunidades/importar"
            inputId="opportunity-file"
            emptyLabel="Seleccionar CSV de oportunidades"
            loadingLabel="Importando"
            submitLabel="Importar oportunidades"
            successVariant="oportunidades"
          />
          <OpportunityImport
            endpoint="/api/oportunidades/importar-colaboradores"
            inputId="opportunity-collaborators-file"
            emptyLabel="Seleccionar CSV de colaboradores"
            loadingLabel="Sincronizando"
            submitLabel="Importar colaboradores"
            successVariant="colaboradores"
          />
        </div>
      </section>

      <section className="opportunity-metrics" aria-label="Resumen de oportunidades">
        <div>
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div data-alert={summary.pendientesAsociacion > 0 ? "true" : "false"}>
          <span>Oportunidades sin vendedor</span>
          <strong>{summary.pendientesAsociacion}</strong>
        </div>
        <div>
          <span>Con presupuesto</span>
          <strong>{summary.presupuestoSincronizado}</strong>
        </div>
        <div data-alert={summary.origenesSinSuborigen > 0 ? "true" : "false"}>
          <span>Orígenes sin suborigen</span>
          <strong>{summary.origenesSinSuborigen}</strong>
        </div>
        {summary.etapas.map((stage) => (
          <div key={stage.nombre}>
            <span>{stage.nombre}</span>
            <strong>{stage.total}</strong>
          </div>
        ))}
      </section>

      {summary.ultimaImportacion && (
        <section className="last-import" aria-label="Ultima importacion">
          <div>
            <span>Ultima importacion</span>
            <strong>{summary.ultimaImportacion.archivo}</strong>
          </div>
          <p>{formatImportDate(summary.ultimaImportacion.importadoEn)}</p>
          <p>{summary.ultimaImportacion.creados} creados</p>
          <p>{summary.ultimaImportacion.actualizados} actualizados</p>
        </section>
      )}

      <section
        className="pending-owners"
        aria-labelledby="pending-owners-title"
        data-complete={pendingOwners.length === 0 ? "true" : "false"}
      >
        <div className="pending-owners__heading">
          <div>
            <p className="section-kicker">Asociaciones pendientes</p>
            <h2 id="pending-owners-title">Propietarios sin vendedor</h2>
          </div>
          <div className="pending-owners__actions">
            <span>{pendingOwners.length} pendientes</span>
            {pendingOwners.length > 0 && (
              <Link href="/vendedores">
                Relacionar en Vendedores
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {pendingOwners.length > 0 ? (
          <div className="pending-owners__list">
            {pendingOwners.map((owner) => (
              <div className="pending-owner" key={owner.clave}>
                <span className="pending-owner__dot" aria-hidden="true" />
                <strong>{owner.nombre}</strong>
                <span>
                  {owner.oportunidades} {owner.oportunidades === 1 ? "oportunidad" : "oportunidades"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pending-owners__complete">
            <CircleCheck aria-hidden="true" />
            <span>
              {owners.length > 0
                ? "Todos los propietarios tienen un vendedor asignado."
                : "No hay propietarios importados para relacionar."}
            </span>
          </div>
        )}
      </section>

      <section className="recent-opportunities" aria-labelledby="recent-title">
        <div className="compact-heading">
          <div>
            <p className="section-kicker">Ordenadas por fecha de creacion</p>
            <h2 id="recent-title">Ultimas 10 oportunidades</h2>
          </div>
        </div>

        <div className="table-scroll">
          <table className="opportunity-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Oportunidad</th>
                <th scope="col">Propietario</th>
                <th scope="col">Origen</th>
                <th scope="col">Suborigen</th>
                <th scope="col">Etapa</th>
                <th scope="col">Creacion</th>
                <th scope="col">Cierre</th>
                <th scope="col">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {summary.recientes.map((opportunity) => (
                <tr key={opportunity.oportunidadId}>
                  <td className="opportunity-id">{opportunity.oportunidadId}</td>
                  <td className="opportunity-name">{opportunity.nombre ?? "Sin nombre"}</td>
                  <td>{opportunity.propietarioNombre}</td>
                  <td>{opportunity.origen ?? "Sin origen"}</td>
                  <td>
                    <span className="mapping-state" data-mapped={opportunity.suborigenNombre ? "true" : "false"}>
                      {opportunity.suborigenNombre ?? "Pendiente"}
                    </span>
                  </td>
                  <td>{opportunity.etapa ?? "Sin etapa"}</td>
                  <td>{formatDate(opportunity.fechaCreacion)}</td>
                  <td>{formatDate(opportunity.fechaCierre)}</td>
                  <td>
                    {opportunity.vendedorCodigo === null ? (
                      <span className="mapping-state" data-mapped="false">Pendiente</span>
                    ) : (
                      <span className="mapping-state" data-mapped="true">
                        #{opportunity.vendedorCodigo}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {summary.recientes.length === 0 && (
          <div className="empty-state">Importe un archivo CSV para comenzar.</div>
        )}
      </section>
    </main>
  );
}
