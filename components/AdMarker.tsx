"use client";

import { RefObject, useRef, useState, PointerEvent } from "react";
import { Marker, AD_TYPE_COLORS } from "@/lib/types";

interface Props {
  marker: Marker;
  left: number; // px, left edge of the ad block on the track
  width: number; // px, block width (ad display duration * pps)
  trackRef: RefObject<HTMLDivElement | null>;
  pixelsPerSecond: number;
  selected: boolean;
  played: boolean;
  justAdded: boolean;
  onSelect: (id: string) => void;
  // report the block's target left edge, in display seconds
  onDragMove: (id: string, dispStartSeconds: number) => void;
  onDragEnd: (id: string, dispStartSeconds: number) => void;
}

export default function AdMarker({
  marker,
  left,
  width,
  trackRef,
  pixelsPerSecond,
  selected,
  played,
  justAdded,
  onSelect,
  onDragMove,
  onDragEnd,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const grabOffsetRef = useRef(0); // px between block left edge and pointer
  const liveRef = useRef(left / pixelsPerSecond);
  const c = AD_TYPE_COLORS[marker.type];

  function handleDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = trackRef.current?.getBoundingClientRect();
    grabOffsetRef.current = rect ? e.clientX - rect.left - left : 0;
    setDragging(true);
    movedRef.current = false;
  }
  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    movedRef.current = true;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    let leftPx = e.clientX - rect.left - grabOffsetRef.current;
    if (leftPx < 0) leftPx = 0;
    const dispStart = leftPx / pixelsPerSecond;
    liveRef.current = dispStart;
    onDragMove(marker.id, dispStart);
  }
  function handleUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    if (movedRef.current) onDragEnd(marker.id, liveRef.current);
    else onSelect(marker.id);
  }

  return (
    <div
      className={`absolute top-0 bottom-0 cursor-grab active:cursor-grabbing select-none ${
        justAdded ? "block-pop" : ""
      }`}
      style={{
        left,
        width,
        background: c.block,
        border: "2.5px solid #111111",
        borderRadius: 8,
        opacity: played ? 0.9 : 1,
        zIndex: selected ? 20 : 10,
        boxShadow: selected ? "0 0 0 2px #111111" : "none",
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      title={`${marker.type} ad @ ${marker.time.toFixed(1)}s`}
    >
      {/* type badge, top-left */}
      <span
        className="absolute top-1 left-1 px-1.5 h-5 grid place-items-center rounded-md text-[11px] font-bold text-white"
        style={{ background: c.solid, border: "1.5px solid #111111" }}
      >
        {c.letter}
      </span>
      {/* grip, bottom-center */}
      <span
        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 grid grid-cols-2 gap-x-0.5 gap-y-[3px]"
        aria-hidden
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] h-[3px] rounded-full"
            style={{ background: c.solid }}
          />
        ))}
      </span>
    </div>
  );
}
