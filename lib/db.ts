import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Defaults to a local libSQL file so the app runs with no external setup.
// Set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to use a hosted Turso db.
const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
