import { defineConfig } from "drizzle-kit";

// Reads the same env as the app. Defaults to a local libSQL file so the
// project runs with zero external setup. Set TURSO_DATABASE_URL +
// TURSO_AUTH_TOKEN to point at a real Turso database instead.
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
