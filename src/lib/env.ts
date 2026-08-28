import "server-only";

function withMongoBooleanParam(uri: string, key: string, value: boolean) {
  const normalizedKey = key.toLowerCase();

  if (!uri.includes("://")) {
    return uri;
  }

  const [base, hash = ""] = uri.split("#", 2);
  const [path, query = ""] = base.split("?", 2);
  const params = new URLSearchParams(query);
  const hasParam = [...params.keys()].some(
    (item) => item.toLowerCase() === normalizedKey,
  );

  if (!hasParam) {
    params.set(key, value ? "true" : "false");
  }

  const nextQuery = params.toString();
  const nextBase = nextQuery ? `${path}?${nextQuery}` : path;
  return hash ? `${nextBase}#${hash}` : nextBase;
}

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
  const uri = withMongoBooleanParam(required("MONGODB_URI"), "retryWrites", false);

  return {
    uri,
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

export function getCentralAuthConfig() {
  return {
    authUrl: required("CENTRAL_AUTH_URL"),
    appUrl: required("NEXT_PUBLIC_APP_URL"),
    appKey: required("CENTRAL_APP_KEY"),
  };
}
