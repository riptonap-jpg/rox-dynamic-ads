import { Marker } from "./types";

// Each ad occupies this many seconds of the *displayed* timeline. Ads break the
// episode into segments, so the timeline is longer than the episode by
// (number of markers * AD_DISPLAY_SECONDS). Kept in sync with the playback cap.
export const AD_DISPLAY_SECONDS = 15;

export interface VideoSeg {
  kind: "video";
  vStart: number; // episode time at the segment's left edge
  vEnd: number;
  dispStart: number; // position on the displayed timeline
  dispDur: number;
}
export interface AdSeg {
  kind: "ad";
  marker: Marker;
  dispStart: number;
  dispDur: number;
}
export type Seg = VideoSeg | AdSeg;

export interface Layout {
  segments: Seg[];
  displayTotal: number; // episodeDur + markers*AD_DISPLAY_SECONDS
}

// Walk the markers in time order, cutting the episode and inserting an ad block
// at each one. This is the edit-decision-list the timeline renders.
export function buildLayout(
  markers: Marker[],
  episodeDur: number,
  adDur = AD_DISPLAY_SECONDS
): Layout {
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  const segments: Seg[] = [];
  let cursor = 0;
  let disp = 0;
  const dur = episodeDur || 0;

  for (const m of sorted) {
    const t = Math.max(0, Math.min(m.time, dur || m.time));
    if (t > cursor + 0.001) {
      segments.push({
        kind: "video",
        vStart: cursor,
        vEnd: t,
        dispStart: disp,
        dispDur: t - cursor,
      });
      disp += t - cursor;
    }
    segments.push({ kind: "ad", marker: m, dispStart: disp, dispDur: adDur });
    disp += adDur;
    cursor = t;
  }
  if (dur > cursor + 0.001) {
    segments.push({
      kind: "video",
      vStart: cursor,
      vEnd: dur,
      dispStart: disp,
      dispDur: dur - cursor,
    });
    disp += dur - cursor;
  }
  return { segments, displayTotal: disp };
}

// episode time -> position on the displayed timeline (for the playhead while the
// episode is playing)
export function videoToDisplay(layout: Layout, t: number): number {
  for (const s of layout.segments) {
    if (s.kind === "video" && t >= s.vStart - 0.001 && t <= s.vEnd + 0.001) {
      return s.dispStart + Math.max(0, Math.min(t - s.vStart, s.dispDur));
    }
  }
  if (layout.segments.length === 0) return t;
  const last = layout.segments[layout.segments.length - 1];
  return last.dispStart + last.dispDur;
}

// displayed-timeline position -> episode time (for click-to-seek and dragging).
// A position inside an ad block resolves to that ad's marker time.
export function displayToVideo(layout: Layout, disp: number): number {
  for (const s of layout.segments) {
    if (disp >= s.dispStart - 0.001 && disp <= s.dispStart + s.dispDur + 0.001) {
      if (s.kind === "video") return s.vStart + (disp - s.dispStart);
      return s.marker.time;
    }
  }
  if (layout.segments.length === 0) return 0;
  const last = layout.segments[layout.segments.length - 1];
  return last.kind === "video" ? last.vEnd : last.marker.time;
}

// where an ad block for a given marker starts on the displayed timeline
export function adDispStart(layout: Layout, markerId: string): number {
  for (const s of layout.segments) {
    if (s.kind === "ad" && s.marker.id === markerId) return s.dispStart;
  }
  return 0;
}
