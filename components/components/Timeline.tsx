"use client";

import { useRef, useState, useEffect, PointerEvent } from "react";
import { Marker, formatClock } from "@/lib/types";
import { Layout } from "@/lib/layout";
import AdMarker from "./AdMarker";

interface Props {
  layout: Layout;
  pixelsPerSecond: number;
  zoom: number;
  playheadDisplay: number; // seconds on the displayed timeline
  markers: Marker[];
  selectedMarkerId: string | null;
  playedIds: Set<string>;
  justAddedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (pps: number) => void;
  onSeekDisplay: (disp: number) => void;
  onScrubCommit: (disp: number) => void;
  onEditTimeDisplay: (disp: number) => void;
  onSelectMarker: (id: string) => void;
  onDragMoveDisplay: (id: string, dispStart: number) => void;
  onDragEndDisplay: (id: string, dispStart: number) => void;
}

function tickInterval(pps: number): number {
  const target = 90 / pps;
  const nice = [5, 10, 15, 30, 60, 120, 300, 600];
  for (const n of nice) if (n >= target) return n;
  return 600;
}

// stable, organic-looking bar heights for the faux waveform
function barHeight(i: number): number {
  const v =
    Math.abs(Math.sin(i * 0.7) * 0.5 + Math.sin(i * 0.31 + 1.3) * 0.35 +
      Math.sin(i * 1.13) * 0.15);
  // lower floor so bars drop short as well as tall (real audio envelope)
  return 0.1 + 0.9 * v;
}

// Frame 85: track is 128px tall, zinc/900 fill, 8px padding, 2px gap between
// segments. The video (fuchsia) and ad blocks are sibling cards on the dark
// fill — the dark showing through the padding/gaps is the "split", not an outline.
const TRACK_H = 128; // Figma Frame 85 height (Fixed 128)
const INNER_PAD = 8; // Figma padding 8 -> inner content 112
const SEG_GAP = 2; // Figma gap 2 between segments
const INNER_H = TRACK_H - INNER_PAD * 2; // 112, the block height

// One episode segment: a fuchsia/300 card with the white waveform inside it.
// A real ad block sits between two of these with a 2px dark gap on each side, so
// the waveform genuinely breaks rather than running underneath the ad.
const WAVE_STEP = 7; // bar pitch, shared by the bars and their stub row

// One episode segment: a fuchsia/300 card with the white waveform inside it.
// Tall bars grow up from a baseline near the frame bottom; the uniform stubs live
// just below the frame (see WaveStubs) rather than inside it.
function WaveformPiece({ left, width: w }: { left: number; width: number }) {
  const step = WAVE_STEP;
  const n = Math.max(0, Math.floor(w / step));
  const mid = 112; // baseline at the frame bottom; bars grow up from here
  const bars = [];
  for (let i = 0; i < n; i++) {
    const x = i * step + 2;
    const env = barHeight(Math.round((left + x) / step));
    bars.push({ x, top: env * 80 });
  }
  return (
    <div
      className="absolute overflow-hidden pointer-events-none"
      style={{ left, top: INNER_PAD, width: w, height: INNER_H, background: "#f0abfc", borderRadius: 6 }}
    >
      <svg width={w} height={INNER_H}>
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={mid - b.top} width={2} height={b.top} rx={1} fill="#ffffff" opacity={0.75} />
        ))}
      </svg>
    </div>
  );
}

// Uniform, slightly-thinner stub lines that sit just BELOW the track frame, in the
// timestamp strip. Rendered per video segment so they align with the bars above.
function WaveStubs({ left, width: w }: { left: number; width: number }) {
  const step = WAVE_STEP;
  const n = Math.max(0, Math.floor(w / step));
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(i * step + 2);
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left, top: 20 + TRACK_H + 12, width: w, height: 8 }}
    >
      {xs.map((x, i) => (
        <rect key={i} x={x} y={0} width={1.5} height={6} rx={0.75} fill="#9ca3af" />
      ))}
    </svg>
  );
}

function parseClock(s: string): number | null {
  const parts = s.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

export default function Timeline({
  layout,
  pixelsPerSecond,
  zoom,
  playheadDisplay,
  markers,
  selectedMarkerId,
  playedIds,
  justAddedId,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomChange,
  onSeekDisplay,
  onScrubCommit,
  onEditTimeDisplay,
  onSelectMarker,
  onDragMoveDisplay,
  onDragEndDisplay,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [headDrag, setHeadDrag] = useState<number | null>(null); // dragging the playhead

  const headPos = headDrag ?? playheadDisplay;

  // when zoom changes, keep the playhead centered (zoom in/out toward it)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = playheadDisplay * pixelsPerSecond - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelsPerSecond]);

  const width = Math.max(layout.displayTotal * pixelsPerSecond + INNER_PAD * 2, 320);
  const interval = tickInterval(pixelsPerSecond);

  function dispAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    let d = (clientX - rect.left - INNER_PAD) / pixelsPerSecond;
    if (d < 0) d = 0;
    if (d > layout.displayTotal) d = layout.displayTotal;
    return d;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    scrubbingRef.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    onSeekDisplay(dispAt(e.clientX));
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (scrubbingRef.current) onSeekDisplay(dispAt(e.clientX));
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    scrubbingRef.current = false;
    trackRef.current?.releasePointerCapture(e.pointerId);
  }

  // dragging the red playhead flag (can travel into ad blocks)
  function headDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setHeadDrag(headPos);
  }
  function headMove(e: PointerEvent<HTMLDivElement>) {
    if (headDrag == null) return;
    setHeadDrag(dispAt(e.clientX));
  }
  function headUp(e: PointerEvent<HTMLDivElement>) {
    if (headDrag == null) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onScrubCommit(headDrag);
    setHeadDrag(null);
  }

  const ticks: number[] = [];
  for (let t = 0; t <= layout.displayTotal; t += interval) ticks.push(t);

  function commitEdit() {
    const sec = parseClock(editValue);
    if (sec != null) onEditTimeDisplay(sec);
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      {/* header: undo/redo · time · zoom */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-2 text-zinc-700 disabled:text-zinc-300"
          >
            <span className="w-9 h-9 grid place-items-center rounded-full border border-zinc-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" /></svg>
            </span>
            <span className="text-sm">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-2 text-zinc-700 disabled:text-zinc-300"
          >
            <span className="w-9 h-9 grid place-items-center rounded-full border border-zinc-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h4" /></svg>
            </span>
            <span className="text-sm">Redo</span>
          </button>
        </div>

        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-10 w-24 px-3 text-center text-base tabular-nums text-zinc-800 rounded-lg border border-zinc-300 bg-white outline-none focus:border-zinc-400"
          />
        ) : (
          <button
            onClick={() => {
              setEditValue(formatClock(playheadDisplay));
              setEditing(true);
            }}
            className="h-10 inline-flex items-center px-3 rounded-lg border border-zinc-200 text-base tabular-nums text-zinc-800 hover:border-zinc-300 transition-colors"
            title="Click to edit"
          >
            {formatClock(playheadDisplay)}
          </button>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => onZoomChange(Math.max(4, zoom - 4))} className="text-zinc-500 hover:text-zinc-800" aria-label="Zoom out">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6" /></svg>
          </button>
          <input type="range" className="rng w-32" min={4} max={48} step={1} value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} aria-label="Zoom" />
          <button onClick={() => onZoomChange(Math.min(48, zoom + 4))} className="text-zinc-500 hover:text-zinc-800" aria-label="Zoom in">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="timeline-scroll overflow-x-auto overflow-y-visible pb-2">
        <div className="relative" style={{ width, paddingTop: 20 }}>
          {/* track: dark zinc/900 fill. Segments are inset 8px and separated by
              a 2px gap, so the dark shows through as the frame + the splits. */}
          <div
            ref={trackRef}
            className="relative cursor-pointer touch-none overflow-hidden"
            style={{
              height: TRACK_H,
              background: "#18181b",
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
              borderRight: "1px solid #18181b",
            }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
          >
            {layout.segments.map((s) => {
              const left = INNER_PAD + s.dispStart * pixelsPerSecond;
              const w = Math.max(0, s.dispDur * pixelsPerSecond - SEG_GAP);
              if (s.kind === "video") {
                return (
                  <WaveformPiece key={`v-${s.dispStart}-${s.vStart}`} left={left} width={w} />
                );
              }
              return (
                <AdMarker
                  key={s.marker.id}
                  marker={s.marker}
                  left={left}
                  width={w}
                  top={INNER_PAD}
                  height={INNER_H}
                  pad={INNER_PAD}
                  trackRef={trackRef}
                  pixelsPerSecond={pixelsPerSecond}
                  selected={s.marker.id === selectedMarkerId}
                  played={playedIds.has(s.marker.id)}
                  justAdded={s.marker.id === justAddedId}
                  onSelect={onSelectMarker}
                  onDragMove={onDragMoveDisplay}
                  onDragEnd={onDragEndDisplay}
                />
              );
            })}
          </div>

          {/* uniform stub lines just below the frame, in the timestamp strip */}
          {layout.segments.map((s) =>
            s.kind === "video" ? (
              <WaveStubs
                key={`st-${s.dispStart}-${s.vStart}`}
                left={INNER_PAD + s.dispStart * pixelsPerSecond}
                width={Math.max(0, s.dispDur * pixelsPerSecond - SEG_GAP)}
              />
            ) : null
          )}

          {/* red playhead: draggable flag (can be dragged into ad blocks) + line */}
          <div
            className="absolute z-30"
            style={{
              left: INNER_PAD + headPos * pixelsPerSecond,
              top: 0,
              transition: headDrag == null ? "left 75ms linear" : "none",
            }}
          >
            <div
              onPointerDown={headDown}
              onPointerMove={headMove}
              onPointerUp={headUp}
              className="-translate-x-1/2 w-5 h-5 rounded-md bg-red-500 grid place-items-center cursor-ew-resize touch-none"
              title="Drag to scrub"
            >
              <span className="grid grid-cols-2 gap-[2px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="w-[2px] h-[2px] rounded-full bg-white" />
                ))}
              </span>
            </div>
            <div className="-translate-x-1/2 w-[2px] bg-red-500 pointer-events-none" style={{ height: TRACK_H }} />
          </div>

          {/* ruler */}
          <div className="relative h-6 mt-6 select-none">
            {ticks.map((t) => (
              <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: INNER_PAD + t * pixelsPerSecond, transform: "translateX(-50%)" }}>
                <span className="w-px h-2 bg-zinc-300" />
                <span className="mt-1 text-[11px] text-zinc-400 tabular-nums">{formatClock(t)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
