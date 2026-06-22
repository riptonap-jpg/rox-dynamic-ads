import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// One row per ad marker placed on the timeline.
// adIds is stored as a JSON-encoded string array (libSQL has no array type).
export const markers = sqliteTable("markers", {
  id: text("id").primaryKey(),
  time: real("time").notNull(),
  type: text("type").notNull(), // 'static' | 'auto' | 'ab'
  adIds: text("ad_ids").notNull().default("[]"),
  label: text("label").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export type MarkerRow = typeof markers.$inferSelect;
export type NewMarkerRow = typeof markers.$inferInsert;
