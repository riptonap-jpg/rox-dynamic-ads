"use client";

import { RefObject, useRef, useState, PointerEvent } from "react";
import { Marker, AD_TYPE_COLORS } from "@/lib/types";

interface Props {
  marker: Marker;
  pixelsPerSecond: number;
  blockSeconds: number; // visual width of a block, in seconds
  duration: number;
  trackRef: RefObject<HTMLDivElement | null>;
  selected: boolean;
  played: boolean;
  justAdded: boolean;
  onSelect: (id: string) => void;
  onDragMove: (id: string, time: number) => void;
  onDragEnd: (id: string, time: number) => void;
}

export default function AdMarker({
  marker,
  pixelsPerSecond,
  blockSeconds,
  duration,
  trackRef,
  selected,
  played,
  justAdded,
  onSelect,
  onDragMove,
  onDragEnd,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const liveTimeRef = useRef(marker.time);
  const grabOffsetRef = useRef(0); // seconds between block start and pointer
  const c = AD_TYPE_COLORS[marker.type];

  function timeFromPointer(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return marker.time;
    let t = (clientX - rect.left) / pixelsPerSecond - grabOffsetRef.current;
    if (t < 0) t = 0;
    if (duration && t > duration) t = duration;
    return t;
  }

  function handleDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation(); // don't let the track treat this as a seek
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) {
      grabOffsetRef.current =
        (e.clientX - rect.left) / pixelsPerSecond - marker.time;
    }
    setDragging(true);
    movedRef.current = false;
  }
  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    movedRef.current = true;
    const t = timeFromPointer(e.clientX);
    liveTimeRef.current = t;
    onDragMove(marker.id, t);
  }
  function handleUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    if (movedRef.current) onDragEnd(marker.id, liveTimeRef.current);
    else onSelect(marker.id);
  }

  const left = marker.time * pixelsPerSecond;
  const width = Math.max(blockSeconds * pixelsPerSecond, 30);

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md border-2 cursor-grab active:cursor-grabbing select-none ${
        justAdded ? "block-pop" : ""
      }`}
      style={{
        left,
        width,
        background: c.block,
        borderColor: selected ? "#18181b" : c.solid,
        opacity: played ? 0.55 : 1,
        zIndex: selected ? 10 : 5,
        boxShadow: selected ? "0 0 0 2px rgba(0,0,0,0.15)" : "none",
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      title={`${marker.type} ad @ ${marker.time.toFixed(1)}s`}
    >
      {/* type letter chip, top-left */}
      <span
        className="absolute top-1 left-1 px-1.5 rounded text-[11px] font-bold leading-5 text-white shadow-sm"
        style={{ background: c.solid }}
      >
        {c.letter}
      </span>
      {/* drag dots, bottom-center */}
      <span
        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-xs leading-none font-bold"
        style={{ color: c.solid }}
      >
        ⠿
      </span>
    </div>
  );
}
