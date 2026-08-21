import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client.
 *
 * Constructed lazily behind a proxy rather than at module scope. Next imports
 * every route module during `next build` to collect its metadata, so building
 * eagerly would make a missing DATABASE_URL fail the build rather than the
 * first query - which is wrong for CI, and wrong for anyone cloning the repo
 * before setting up a database.
 *
 * The instance is cached on globalThis outside production so the dev server's
 * hot reload does not open a new connection pool on every edit.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Module-scoped cache. This has to exist separately from the globalThis cache:
 * the proxy below resolves the client on every property access, so without a
 * cache that applies in production too, each access would build a new client
 * and a new connection pool.
 */
let cached: PrismaClient | undefined;

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres instance.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (cached) return cached;

  // In dev the module itself is re-evaluated on hot reload, so the instance is
  // parked on globalThis as well to keep one pool across reloads.
  cached = globalForPrisma.prisma ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = cached;
  return cached;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    // Methods are bound to the real client: PrismaClient reads private fields
    // internally, and those throw if `this` is the proxy rather than the
    // instance. This matters for $transaction in particular.
    return typeof value === "function" ? value.bind(client) : value;
  },
  // `db.$transaction(...)` and friends need these to behave like the real thing.
  has(_target, property) {
    return Reflect.has(getClient(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(getClient());
  },
  getOwnPropertyDescriptor(_target, property) {
    return Reflect.getOwnPropertyDescriptor(getClient(), property);
  },
});
