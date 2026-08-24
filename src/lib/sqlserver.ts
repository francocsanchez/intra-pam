import "server-only";

import sql from "mssql";

import { getSqlServerConfig } from "@/lib/env";

type SqlCache = {
  pool: sql.ConnectionPool | null;
  promise: Promise<sql.ConnectionPool> | null;
};

const globalForSql = globalThis as typeof globalThis & {
  intraPamSql?: SqlCache;
};

const cache = globalForSql.intraPamSql ?? {
  pool: null,
  promise: null,
};

globalForSql.intraPamSql = cache;

export async function getSqlConnection(): Promise<sql.ConnectionPool> {
  if (cache.pool?.connected) {
    return cache.pool;
  }

  if (cache.pool && !cache.pool.connected) {
    cache.pool = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    const config = getSqlServerConfig();
    const pool = new sql.ConnectionPool({
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeout: config.timeoutMs,
      requestTimeout: config.timeoutMs,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30_000,
      },
      options: {
        appName: "intra-pam",
        enableArithAbort: true,
        encrypt: config.encrypt,
        readOnlyIntent: true,
        trustServerCertificate: config.trustServerCertificate,
      },
    });

    cache.promise = pool.connect();
  }

  try {
    cache.pool = await cache.promise;
    return cache.pool;
  } catch (error) {
    cache.promise = null;
    cache.pool = null;
    throw error;
  }
}

export async function pingSqlServer(): Promise<void> {
  const pool = await getSqlConnection();
  await pool.request().query("SELECT 1 AS connection_ok");
}
