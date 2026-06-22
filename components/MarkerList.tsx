"use client";

import { Marker, AD_TYPE_LABELS, AD_TYPE_COLORS, formatClock } from "@/lib/types";

interface Props {
  markers: Marker[];
  onCreate: () => void;
  onAutoPlace: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onResults: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export default function MarkerList({
  markers,
  onCreate,
  onAutoPlace,
  onEdit,
  onDelete,
  onResults,
  onSelect,
  selectedId,
}: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-zinc-900">Ad markers</h2>
        <span className="text-xs text-zinc-400">
          {markers.length} marker{markers.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2 flex-1 min-h-[120px]">
        {markers.length === 0 && (
          <p className="text-sm text-zinc-400 py-6 text-center">
            No markers yet. Create one to place an ad.
          </p>
        )}

        {markers.map((m, i) => {
          const c = AD_TYPE_COLORS[m.type];
          const selected = m.id === selectedId;
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                selected
                  ? "border-zinc-300 bg-zinc-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span className="w-4 text-xs text-zinc-400 tabular-nums">
                {i + 1}
              </span>
              <span className="px-2 py-1 rounded-md border border-zinc-200 text-xs tabular-nums text-zinc-700">
                {formatClock(m.time)}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: c.badgeBg, color: c.badgeText }}
              >
                {AD_TYPE_LABELS[m.type]}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {m.type === "ab" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResults(m.id);
                    }}
                    className="px-2 py-1 rounded-md text-xs text-zinc-500 hover:bg-zinc-100"
                    title="A/B results"
                  >
                    Results
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(m.id);
                  }}
                  className="px-2 py-1 rounded-md text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                  }}
                  className="w-7 h-7 grid place-items-center rounded-md text-red-500 bg-red-50 hover:bg-red-100"
                  aria-label="Delete marker"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={onCreate}
          className="w-full h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
        >
          Create ad marker
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={onAutoPlace}
          className="w-full h-10 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
        >
          Automatically place
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
