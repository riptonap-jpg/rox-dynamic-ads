"use client";

// Visual only — matches the editor chrome in the design. Links go nowhere.

const NAV = [
  { label: "Dashboard", active: false, icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { label: "Analytics", active: true, icon: "M4 20V10M10 20V4M16 20v-7" },
  { label: "Ads", active: false, icon: "M12 2v20M2 12h20" },
  { label: "Channels", active: false, icon: "M4 6h16v12H4zM4 10h16" },
  { label: "Import", active: false, icon: "M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" },
  { label: "Settings", active: false, icon: "M12 8a4 4 0 100 8 4 4 0 000-8z" },
];

export default function Sidebar() {
  return (
    <aside className="w-80 shrink-0 hidden lg:flex flex-col bg-white border-r border-zinc-200">
      <div className="p-4 space-y-3">
        <button className="w-full h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          Create an episode
        </button>
        <button className="w-full flex items-center gap-2 h-10 px-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <span className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-rose-500" />
          <span className="text-sm text-zinc-800 flex-1 text-left truncate">
            The Diary Of A CEO
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <nav className="px-3 space-y-0.5">
        {NAV.map((item) => (
          <a
            key={item.label}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              item.active
                ? "bg-zinc-100 text-zinc-900 font-medium"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </a>
        ))}
      </nav>

      {/* weekly plays card */}
      <div className="mx-4 mt-6 rounded-2xl border border-zinc-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">Weekly plays</span>
          <span className="text-[11px] text-emerald-600 font-medium">↑ 17%</span>
        </div>
        <div className="text-xl font-semibold tracking-tight mb-2">738,849</div>
        <svg viewBox="0 0 120 36" className="w-full h-10" preserveAspectRatio="none">
          <polyline
            points="0,28 18,24 32,26 48,16 64,20 80,10 98,14 120,6"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="w-4 h-1 rounded-full bg-zinc-300" />
          <span className="w-1 h-1 rounded-full bg-zinc-200" />
          <span className="w-1 h-1 rounded-full bg-zinc-200" />
        </div>
      </div>

      <div className="mt-auto p-4 space-y-3 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="m10 9 5 3-5 3z" /></svg>
          <span className="flex-1">Demo mode</span>
          <span className="w-8 h-4 rounded-full bg-zinc-200 relative">
            <span className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow" />
          </span>
        </div>
        {[
          { label: "Invite your team", icon: "M4 4h16v16H4zM4 9h16" },
          { label: "Give feedback", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
          { label: "Help & support", icon: "M12 17h.01M12 13a3 3 0 1 0-3-3" },
        ].map((i) => (
          <a key={i.label} href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-2 hover:text-zinc-800">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={i.icon} /></svg>
            {i.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
