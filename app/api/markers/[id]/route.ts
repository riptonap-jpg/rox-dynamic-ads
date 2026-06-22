import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { markers } from "@/lib/schema";
import type { Marker } from "@/lib/types";

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

// PUT /api/markers/[id] -> update time / type / adIds / label
// Used when a marker is dragged to a new time or its type changes.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Only set the fields that were actually sent.
  const patch: Record<string, unknown> = {};
  if (typeof body.time === "number") patch.time = body.time;
  if (typeof body.type === "string") patch.type = body.type;
  if (Array.isArray(body.adIds)) patch.adIds = JSON.stringify(body.adIds);
  if (typeof body.label === "string") patch.label = body.label;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const updated = await db
    .update(markers)
    .set(patch)
    .where(eq(markers.id, id))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(rowToMarker(updated[0]));
}

// DELETE /api/markers/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(markers).where(eq(markers.id, id));
  return NextResponse.json({ ok: true });
}
