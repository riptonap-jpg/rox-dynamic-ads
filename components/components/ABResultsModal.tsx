"use client";

import { Marker, adById } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  marker: Marker;
  onClose: () => void;
  onNewTest: () => void;
}

export default function ABResultsModal({ marker, onClose, onNewTest }: Props) {
  const ads = marker.adIds.map(adById).filter(Boolean);

  // NOTE(perf): there is no real performance data in this build. A production
  // version would rank by metrics logged at playback (impressions, completion
  // rate, click-through) — see the HOOK comment in app/page.tsx pickAd(). Here
  // we just present the selected ads in their saved order as a stand-in.

  return (
    <Modal onClose={onClose} width="max-w-lg">
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-zinc-900">A/B test results</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">✕</button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">{ads.length} ads tested</p>

        <div className="space-y-2">
          {ads.map((ad, i) => (
            <div
              key={ad!.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                i === 0 ? "border-emerald-400 bg-emerald-50/40" : "border-zinc-200"
              }`}
            >
              <span className="w-16 h-12 rounded-md bg-gradient-to-br from-zinc-200 to-zinc-300 grid place-items-center text-zinc-500 text-xs font-semibold shrink-0">
                {ad!.advertiser.slice(0, 2)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-zinc-900 truncate">{ad!.title}</span>
                <span className="block text-xs text-zinc-400">{ad!.date} · {ad!.duration}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  i === 0 ? "bg-emerald-100 text-emerald-700" : "border border-zinc-200 text-zinc-500"
                }`}
              >
                #{i + 1}
              </span>
            </div>
          ))}
          {ads.length === 0 && (
            <p className="text-sm text-zinc-400 py-4 text-center">No ads selected for this test yet.</p>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 mt-3">
          Ranking is a placeholder. Real results would come from playback metrics
          logged per variant.
        </p>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onNewTest} className="px-4 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50">
            New test
          </button>
          <button onClick={onClose} className="px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
