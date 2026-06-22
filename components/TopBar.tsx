"use client";

// Visual only. App-wide top bar from the design: wordmark on the left,
// settings / notifications / account on the right.

export default function TopBar() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" className="text-zinc-900">
          <path d="M12 3 L21 19 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span className="font-semibold tracking-tight text-[15px]">Vidpod</span>
      </div>

      <div className="flex items-center gap-3 text-zinc-500">
        <button className="hover:text-zinc-900 transition-colors" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.61.78 1.05 1.42 1.05H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="hover:text-zinc-900 transition-colors" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
        <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
          <span className="text-sm text-zinc-800">Emma Warren</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </header>
  );
}
