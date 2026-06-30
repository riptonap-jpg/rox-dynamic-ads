"use client";

import { useRef, useState, useMemo, useEffect, PointerEvent } from "react";
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
  return 0.25 + 0.75 * v;
}

function parseClock(s: string): number | null {
  const parts = s.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

const TRACK_H = 84;

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

  const width = Math.max(layout.displayTotal * pixelsPerSecond, 320);
  const interval = tickInterval(pixelsPerSecond);

  const bars = useMemo(() => {
    const step = 4;
    const n = Math.floor(width / step);
    return Array.from({ length: n }, (_, i) => ({
      x: i * step + 2,
      h: barHeight(i) * (TRACK_H - 16),
    }));
  }, [width]);

  function dispAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    let d = (clientX - rect.left) / pixelsPerSecond;
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
            className="w-28 text-center text-base tabular-nums text-zinc-800 bg-transparent outline-none border-b border-zinc-300"
          />
        ) : (
          <button
            onClick={() => {
              setEditValue(formatClock(playheadDisplay));
              setEditing(true);
            }}
            className="text-base tabular-nums text-zinc-800 hover:text-zinc-900 px-2 py-1 rounded"
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
          {/* track */}
          <div
            ref={trackRef}
            className="waveform relative rounded-xl border-[3px] border-zinc-900 cursor-pointer touch-none overflow-hidden"
            style={{ height: TRACK_H }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
          >
            {/* white-bar waveform */}
            <svg width={width} height={TRACK_H} className="absolute inset-0 pointer-events-none">
              {bars.map((b, i) => (
                <rect
                  key={i}
                  x={b.x}
                  y={(TRACK_H - b.h) / 2}
                  width={2}
                  height={b.h}
                  rx={1}
                  fill="#ffffff"
                  opacity={0.65}
                />
              ))}
            </svg>

            {/* ad blocks cut into the timeline */}
            {layout.segments.map((s) =>
              s.kind === "ad" ? (
                <AdMarker
                  key={s.marker.id}
                  marker={s.marker}
                  left={s.dispStart * pixelsPerSecond}
                  width={s.dispDur * pixelsPerSecond}
                  trackRef={trackRef}
                  pixelsPerSecond={pixelsPerSecond}
                  selected={s.marker.id === selectedMarkerId}
                  played={playedIds.has(s.marker.id)}
                  justAdded={s.marker.id === justAddedId}
                  onSelect={onSelectMarker}
                  onDragMove={onDragMoveDisplay}
                  onDragEnd={onDragEndDisplay}
                />
              ) : null
            )}
          </div>

          {/* red playhead: draggable flag (can be dragged into ad blocks) + line */}
          <div
            className="absolute z-30"
            style={{
              left: headPos * pixelsPerSecond,
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
          <div className="relative h-6 mt-2 select-none">
            {ticks.map((t) => (
              <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: t * pixelsPerSecond, transform: "translateX(-50%)" }}>
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
