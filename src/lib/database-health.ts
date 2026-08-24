import "server-only";

import { pingMongo } from "@/lib/mongodb";
import { pingSqlServer } from "@/lib/sqlserver";

export type DatabaseStatus = {
  id: "mongodb" | "sqlserver";
  name: string;
  database: string;
  mode: "Lectura y escritura" | "Solo consulta";
  connected: boolean;
  latencyMs: number;
  message: string;
};

export type DatabaseHealth = {
  healthy: boolean;
  checkedAt: string;
  services: DatabaseStatus[];
};

async function measure(
  details: Omit<DatabaseStatus, "connected" | "latencyMs" | "message">,
  ping: () => Promise<void>,
): Promise<DatabaseStatus> {
  const startedAt = performance.now();

  try {
    await ping();

    return {
      ...details,
      connected: true,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      message: "Conexion verificada",
    };
  } catch {
    return {
      ...details,
      connected: false,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      message: "No se pudo establecer la conexion",
    };
  }
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const services = await Promise.all([
    measure(
      {
        id: "mongodb",
        name: "MongoDB",
        database: "intra-pam",
        mode: "Lectura y escritura",
      },
      pingMongo,
    ),
    measure(
      {
        id: "sqlserver",
        name: "SQL Server",
        database: "Siac",
        mode: "Solo consulta",
      },
      pingSqlServer,
    ),
  ]);

  return {
    healthy: services.every((service) => service.connected),
    checkedAt: new Date().toISOString(),
    services,
  };
}
