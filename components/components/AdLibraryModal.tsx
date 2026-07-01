"use client";

import { useState } from "react";
import { Marker, SAMPLE_ADS, Ad } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  marker: Marker;
  onClose: () => void;
  onSave: (adIds: string[]) => void;
}

// folder tree (visual). `child` items are indented under the parent above them.
const FOLDERS: { label: string; child?: boolean; chevron?: boolean }[] = [
  { label: "All folders" },
  { label: "Eight Sleep", chevron: true },
  { label: "Pod 3", child: true },
  { label: "Q3 Promo", child: true },
  { label: "Athlete Campaign", child: true },
  { label: "Brilliant", chevron: true },
  { label: "Milligram", chevron: true },
];

function thumbFor(ad: Ad): string {
  // a stable random image per ad (Rox: "just grab three random images")
  return `https://picsum.photos/seed/${ad.id}/120/90`;
}

export default function AdLibraryModal({ marker, onClose, onSave }: Props) {
  const isStatic = marker.type === "static";
  const isAb = marker.type === "ab";
  const [selected, setSelected] = useState<string[]>(marker.adIds);

  function toggle(id: string) {
    if (isStatic) {
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

        <div className="flex gap-4 h-[380px]">
          {/* folder tree */}
          <div className="w-44 shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-2.5 h-9 mb-2 rounded-lg border border-zinc-200 text-sm text-zinc-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              Search library...
            </div>
            <div className="flex items-center gap-2 px-1 py-1.5 text-xs text-zinc-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11" /></svg>
              Ad library
            </div>
            <div className="overflow-y-auto">
              {FOLDERS.map((f, i) => (
                <button
                  key={f.label}
                  className={`w-full flex items-center justify-between px-1 py-1.5 rounded-md text-sm hover:bg-zinc-50 ${
                    i === 0 ? "text-zinc-900 font-medium" : "text-zinc-600"
                  } ${f.child ? "pl-5" : ""}`}
                >
                  <span>{f.label}</span>
                  {f.chevron && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="m6 9 6 6 6-6" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ad cards */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex gap-2 mb-3">
              <div className="px-3 h-9 grid place-items-center rounded-lg border border-zinc-200 text-sm text-zinc-500 whitespace-nowrap">
                Upload date ⌄
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                Search ads...
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbFor(ad)}
                      alt=""
                      width={64}
                      height={48}
                      className="w-16 h-12 rounded-md object-cover bg-zinc-200 shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 truncate">{ad.title}</span>
                      <span className="block text-xs text-zinc-400">{ad.date} · {ad.duration}</span>
                      <span className="flex items-center gap-1.5 mt-1">
                        <span className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
                        <span className="text-[11px] text-zinc-500">Denis Loginoff</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 mr-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[11px] text-zinc-600">{ad.advertiser}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[11px] text-zinc-600">{ad.folder}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(ad.id)}
                      className="w-4 h-4 accent-zinc-900 shrink-0"
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
