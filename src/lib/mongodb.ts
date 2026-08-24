import "server-only";

import mongoose from "mongoose";

import { getMongoConfig } from "@/lib/env";

type MongoCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  intraPamMongo?: MongoCache;
};

const cache = globalForMongo.intraPamMongo ?? {
  connection: null,
  promise: null,
};

globalForMongo.intraPamMongo = cache;

export async function getMongoConnection(): Promise<typeof mongoose> {
  if (cache.connection?.connection.readyState === 1) {
    return cache.connection;
  }

  if (
    cache.connection?.connection.readyState === 0 ||
    cache.connection?.connection.readyState === 3
  ) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    const { uri, timeoutMs } = getMongoConfig();

    cache.promise = mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: timeoutMs,
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    cache.connection = null;
    throw error;
  }
}

export async function pingMongo(): Promise<void> {
  const connection = await getMongoConnection();
  const database = connection.connection.db;

  if (!database) {
    throw new Error("MongoDB no expuso una base de datos activa.");
  }

  await database.admin().ping();
}
