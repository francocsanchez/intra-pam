import { connection } from "next/server";

import { getDatabaseHealth } from "@/lib/database-health";

export default async function Home() {
  await connection();
  const health = await getDatabaseHealth();

  return (
    <main className="status-home" aria-label="Estado de las conexiones">
      <div className="connection-lines">
        {health.services.map((service) => (
          <div
            className="connection-line"
            data-connected={service.connected ? "true" : "false"}
            key={service.id}
          >
            <span>{service.name}</span>
            <span className="connection-line__rail" aria-hidden="true" />
            <span className="connection-line__dot" aria-hidden="true" />
            <span className="sr-only">
              {service.connected ? "Conexion correcta" : "Conexion no disponible"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
