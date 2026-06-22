import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { markers } from "@/lib/schema";
import type { Marker, MarkerInput } from "@/lib/types";

// Decode a DB row into the shape the client uses (adIds as a real array).
function rowToMarker(row: typeof markers.$inferSelect): Marker {
  let adIds: string[] = [];
  try {
    adIds = JSON.parse(row.adIds);
  } catch {
    adIds = [];
  }
  return {
    id: row.id,
    time: row.time,
    type: row.type as Marker["type"],
    adIds,
    label: row.label,
    createdAt: row.createdAt,
  };
}

// GET /api/markers -> all markers ordered by time
export async function GET() {
  const rows = await db.select().from(markers).orderBy(asc(markers.time));
  return NextResponse.json(rows.map(rowToMarker));
}

// POST /api/markers -> create one from { time, type, adIds, label }
export async function POST(req: Request) {
  const body = (await req.json()) as MarkerInput;

  if (typeof body.time !== "number" || !body.type) {
    return NextResponse.json(
      { error: "time and type are required" },
      { status: 400 }
    );
  }

  const row = {
    // Honor a client-supplied id when present. The editor generates the id up
    // front so optimistic UI and undo/redo (which can re-create a deleted
    // marker) keep a stable identity. Falls back to a server uuid otherwise.
    id: typeof body.id === "string" && body.id ? body.id : crypto.randomUUID(),
    time: body.time,
    type: body.type,
    adIds: JSON.stringify(body.adIds ?? []),
    label: body.label ?? "",
    createdAt: Date.now(),
  };

  await db.insert(markers).values(row);
  return NextResponse.json(rowToMarker(row), { status: 201 });
}
