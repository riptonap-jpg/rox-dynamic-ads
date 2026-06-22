"use client";

import { useState } from "react";
import { AdType, AD_TYPE_LABELS, AD_TYPE_DESC } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onConfirm: (type: AdType) => void;
}

const ORDER: AdType[] = ["auto", "static", "ab"];

function TypeIcon({ type }: { type: AdType }) {
  if (type === "auto")
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3">
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  if (type === "static")
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6.5L4.5 17a2.5 2.5 0 0 0 2.2 3.7" />
      <path d="M15 3v6.5l4.5 7.5a2.5 2.5 0 0 1-2.2 3.7H7" />
      <path d="M9 3h6M8 12h8" />
    </svg>
  );
}

export default function CreateMarkerModal({ onClose, onConfirm }: Props) {
  const [type, setType] = useState<AdType>("auto");

  return (
    <Modal onClose={onClose} width="max-w-md">
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-zinc-900">Create ad marker</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">✕</button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">Insert a new ad marker into this episode</p>

        <div className="space-y-2">
          {ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                type === t ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
                <TypeIcon type={t} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-zinc-900">
                  {t === "ab" ? "A/B test" : AD_TYPE_LABELS[t]}
                </span>
                <span className="block text-xs text-zinc-500">{AD_TYPE_DESC[t]}</span>
              </span>
              <span
                className={`w-4 h-4 rounded-full border-2 grid place-items-center ${
                  type === t ? "border-zinc-900" : "border-zinc-300"
                }`}
              >
                {type === t && <span className="w-2 h-2 rounded-full bg-zinc-900" />}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(type)} className="px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800">
            Select marker
          </button>
        </div>
      </div>
    </Modal>
  );
}
