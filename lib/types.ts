// Shared types + the fixed seed list of ads for this build.
// Ads are not stored in the DB for the take-home; markers reference them by id.

export type AdType = "auto" | "static" | "ab";

export interface Ad {
  id: string;
  title: string;
  src: string;
  advertiser: string;
  folder: string;
  date: string; // display only
  duration: string; // display only
}

export interface Marker {
  id: string;
  time: number; // seconds into the main video
  type: AdType;
  adIds: string[]; // which ads are in play at this marker
  label: string;
  createdAt: number;
}

// What the API expects on create. The DB stores adIds as a JSON string;
// the route handlers do the encode/decode so the client always sees an array.
export interface MarkerInput {
  id?: string; // optional client-supplied id (see POST handler)
  time: number;
  type: AdType;
  adIds: string[];
  label?: string;
}

// Public sample clips from Google's gtv-videos-bucket. These load fine in the
// browser at runtime. Titles/metadata are dressed up to match the design's ad
// library. If you'd rather self-host, drop files in /public and point src at
// /ad-1.mp4 etc. (see README).
// Served from /public so the app has no external/network dependency.
// Download script is in the README; files are git-ignored to keep the repo light.
export const SAMPLE_ADS: Ad[] = [
  {
    id: "ad-eightsleep-v1",
    title: "Eight Sleep Q4 Pod 3 - v1",
    src: "/ad-1.mp4",
    advertiser: "Eight Sleep",
    folder: "Pod 3",
    date: "13/03/24",
    duration: "0m 52s",
  },
  {
    id: "ad-eightsleep-v2",
    title: "Eight Sleep Q4 Pod 3 - v2",
    src: "/ad-2.mp4",
    advertiser: "Eight Sleep",
    folder: "Pod 3",
    date: "13/03/24",
    duration: "0m 10s",
  },
  {
    id: "ad-brilliant",
    title: "Brilliant (maths & physics)",
    src: "/ad-3.mp4",
    advertiser: "Brilliant",
    folder: "Back to school '24",
    date: "13/03/24",
    duration: "0m 15s",
  },
];

export const MAIN_VIDEO_SRC = "/main-video.mp4";

export function adById(id: string): Ad | undefined {
  return SAMPLE_ADS.find((a) => a.id === id);
}

// m:ss for the player readout
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// HH:MM:SS for the timeline ruler + center readout (matches the design)
export function formatClock(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const AD_TYPE_LABELS: Record<AdType, string> = {
  auto: "Auto",
  static: "Static",
  ab: "A/B",
};

export const AD_TYPE_DESC: Record<AdType, string> = {
  auto: "Automatic ad insertions",
  static: "A marker for a specific ad that you select",
  ab: "Compare the performance of multiple ads",
};

// green / blue / amber, matching the badges and timeline blocks in the design
export const AD_TYPE_COLORS: Record<
  AdType,
  { solid: string; block: string; badgeBg: string; badgeText: string; letter: string }
> = {
  auto: {
    solid: "#16a34a",
    block: "#86efac",
    badgeBg: "#dcfce7",
    badgeText: "#15803d",
    letter: "A",
  },
  static: {
    solid: "#2563eb",
    block: "#93c5fd",
    badgeBg: "#dbeafe",
    badgeText: "#1d4ed8",
    letter: "S",
  },
  ab: {
    solid: "#d97706",
    block: "#fcd34d",
    badgeBg: "#fef3c7",
    badgeText: "#b45309",
    letter: "A/B",
  },
};
