"use client";

import { useState } from "react";
import { Marker, SAMPLE_ADS } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  marker: Marker;
  onClose: () => void;
  onSave: (adIds: string[]) => void;
}

const FOLDERS = [
  "All folders",
  "Eight Sleep",
  "Pod 3",
  "Q3 Promo",
  "Athlete Campaign",
  "Brilliant",
  "Milligram",
];

export default function AdLibraryModal({ marker, onClose, onSave }: Props) {
  const isStatic = marker.type === "static";
  const isAb = marker.type === "ab";
  const [selected, setSelected] = useState<string[]>(marker.adIds);

  function toggle(id: string) {
    if (isStatic) {
      // static plays exactly one ad
      setSelected([id]);
      return;
    }
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  return (
    <Modal onClose={onClose} width="max-w-3xl">
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-zinc-900">
            {isAb ? "A/B test" : isStatic ? "Select an ad" : "Select ads"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">✕</button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          {isAb
            ? "Select which ads you'd like to A/B test"
            : isStatic
            ? "Pick the specific ad to play at this marker"
            : "Pick the pool of ads that can play at this marker"}
        </p>

        <div className="flex gap-4 h-[360px]">
          {/* folder tree (visual) */}
          <div className="w-44 shrink-0 border border-zinc-200 rounded-xl p-2 overflow-y-auto">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11" /></svg>
              Ad library
            </div>
            {FOLDERS.map((f, i) => (
              <button
                key={f}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-zinc-50 ${
                  i === 0 ? "text-zinc-900 font-medium" : "text-zinc-600"
                } ${i > 1 && i < 5 ? "pl-5" : ""}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* ad cards */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                Search library...
              </div>
              <div className="px-3 h-9 grid place-items-center rounded-lg border border-zinc-200 text-sm text-zinc-500">
                Upload date ⌄
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {SAMPLE_ADS.map((ad) => {
                const checked = selected.includes(ad.id);
                return (
                  <label
                    key={ad.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      checked ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="w-16 h-12 rounded-md bg-gradient-to-br from-zinc-200 to-zinc-300 grid place-items-center text-zinc-500 text-xs font-semibold shrink-0">
                      {ad.advertiser.slice(0, 2)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 truncate">{ad.title}</span>
                      <span className="block text-xs text-zinc-400">{ad.date} · {ad.duration}</span>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-zinc-500">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100">{ad.advertiser}</span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100">{ad.folder}</span>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(ad.id)}
                      className="w-4 h-4 accent-zinc-900"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={onClose} className="px-4 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {selected.length} ad{selected.length === 1 ? "" : "s"} selected
            </span>
            <button
              onClick={() => onSave(selected)}
              disabled={selected.length === 0}
              className="px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
            >
              {isAb ? "Create A/B test" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
