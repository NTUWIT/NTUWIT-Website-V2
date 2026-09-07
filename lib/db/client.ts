import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * The connection is created on first query, not on import.
 *
 * `next build` imports every route module to collect its config, so anything
 * that reads a secret at module scope turns a missing environment variable into
 * a failed build rather than a failed request. Build machines have no reason to
 * hold database credentials, and preview deployments frequently do not.
 *
 * The error still fires, loudly, the first time a query actually runs.
 */
type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | null = null;

function connect(): Db {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  instance = drizzle(neon(url), { schema });
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, property) {
    const live = connect();
    const value = Reflect.get(live, property) as unknown;
    // Drizzle's builders rely on `this`, so a method has to stay bound to the
    // real instance rather than to the proxy.
    return typeof value === "function" ? value.bind(live) : value;
  },
});
