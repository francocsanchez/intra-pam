import "server-only";

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${name}.`);
  }

  return value;
}

function positiveInteger(name: string, fallback?: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue && fallback !== undefined) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`La variable de entorno ${name} debe ser un entero positivo.`);
  }

  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value !== "true" && value !== "false") {
    throw new Error(`La variable de entorno ${name} debe ser true o false.`);
  }

  return value === "true";
}

export function getMongoConfig() {
  return {
    uri: required("MONGODB_URI"),
    timeoutMs: positiveInteger("DB_CONNECTION_TIMEOUT_MS", 5000),
  };
}

export function getSqlServerConfig() {
  return {
    server: required("DBHOST_NIC"),
    port: positiveInteger("DBPORT_NIC"),
    database: required("DATABASE_NIC"),
    user: required("DBUSER_NIC"),
    password: required("DBPASS_NIC"),
    timeoutMs: positiveInteger("DB_CONNECTION_TIMEOUT_MS", 5000),
    encrypt: booleanValue("SQL_ENCRYPT", false),
    trustServerCertificate: booleanValue(
      "SQL_TRUST_SERVER_CERTIFICATE",
      true,
    ),
  };
}
