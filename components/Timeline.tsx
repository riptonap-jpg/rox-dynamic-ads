"use client";

import { useRef, PointerEvent } from "react";
import { Marker, formatClock } from "@/lib/types";
import AdMarker from "./AdMarker";

interface Props {
  duration: number;
  pixelsPerSecond: number;
  blockSeconds: number;
  playheadTime: number;
  markers: Marker[];
  selectedMarkerId: string | null;
  playedIds: Set<string>;
  justAddedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (pps: number) => void;
  onSeek: (t: number) => void;
  onSelectMarker: (id: string) => void;
  onDragMove: (id: string, time: number) => void;
  onDragEnd: (id: string, time: number) => void;
}

// aim for a label roughly every ~90px, snapped to a readable interval
function tickInterval(pps: number): number {
  const target = 90 / pps;
  const nice = [5, 10, 15, 30, 60, 120, 300, 600];
  for (const n of nice) if (n >= target) return n;
  return 600;
}

export default function Timeline({
  duration,
  pixelsPerSecond,
  blockSeconds,
  playheadTime,
  markers,
  selectedMarkerId,
  playedIds,
  justAddedId,
  canUndo,
  canRedo,
  zoom,
  onUndo,
  onRedo,
  onZoomChange,
  onSeek,
  onSelectMarker,
  onDragMove,
  onDragEnd,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);

  const width = Math.max((duration || 0) * pixelsPerSecond, 320);
  const interval = tickInterval(pixelsPerSecond);

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    let t = (clientX - rect.left) / pixelsPerSecond;
    if (t < 0) t = 0;
    if (duration && t > duration) t = duration;
    return t;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    scrubbingRef.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    onSeek(timeAt(e.clientX));
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (scrubbingRef.current) onSeek(timeAt(e.clientX));
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    scrubbingRef.current = false;
    trackRef.current?.releasePointerCapture(e.pointerId);
  }

  const ticks: number[] = [];
  for (let t = 0; t <= (duration || 0); t += interval) ticks.push(t);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      {/* header: undo/redo · time · zoom */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></svg>
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h1" /></svg>
            Redo
          </button>
        </div>

        <div className="px-3 h-8 grid place-items-center rounded-lg border border-zinc-200 text-sm tabular-nums text-zinc-700">
          {formatClock(playheadTime)}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onZoomChange(Math.max(4, zoom - 4))} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100" aria-label="Zoom out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6" /></svg>
          </button>
          <input
            type="range"
            className="rng w-28"
            min={4}
            max={40}
            step={1}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            aria-label="Timeline zoom"
          />
          <button onClick={() => onZoomChange(Math.min(40, zoom + 4))} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100" aria-label="Zoom in">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
          </button>
        </div>
      </div>

      {/* scrollable timeline */}
      <div className="timeline-scroll overflow-x-auto overflow-y-visible pb-2">
        <div className="relative" style={{ width }}>
          {/* waveform track with ad blocks */}
          <div
            ref={trackRef}
            className="waveform relative h-24 rounded-lg border-2 border-zinc-900 cursor-pointer touch-none overflow-hidden"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
          >
            {markers.map((m) => (
              <AdMarker
                key={m.id}
                marker={m}
                pixelsPerSecond={pixelsPerSecond}
                blockSeconds={blockSeconds}
                duration={duration}
                trackRef={trackRef}
                selected={m.id === selectedMarkerId}
                played={playedIds.has(m.id)}
                justAdded={m.id === justAddedId}
                onSelect={onSelectMarker}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>

          {/* red playhead spanning track + handle, above everything */}
          <div
            className="absolute -top-2 h-[104px] w-[2px] bg-red-500 pointer-events-none z-20 transition-[left] duration-75 ease-linear"
            style={{ left: playheadTime * pixelsPerSecond }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-5 rounded-sm bg-red-500 grid place-items-center">
              <span className="text-white text-[9px] leading-none">⠿</span>
            </div>
          </div>

          {/* ruler */}
          <div className="relative h-6 mt-1.5 select-none">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: t * pixelsPerSecond, transform: "translateX(-50%)" }}
              >
                <span className="w-px h-1.5 bg-zinc-300" />
                <span className="mt-0.5 text-[10px] text-zinc-400 tabular-nums">
                  {formatClock(t)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
