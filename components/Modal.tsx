"use client";

import { ReactNode, useEffect } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  width?: string; // tailwind max-w class
}

// Small backdrop + centered dialog. Closes on Escape and backdrop click.
export default function Modal({ onClose, children, width = "max-w-md" }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 overlay-in p-4"
      onClick={onClose}
    >
      <div
        className={`dialog-in w-full ${width} rounded-2xl bg-white shadow-2xl border border-zinc-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
