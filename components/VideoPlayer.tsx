"use client";

import { RefObject } from "react";
import { formatTime } from "@/lib/types";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  isPlaying: boolean;
  isAdPlaying: boolean;
  adTitle: string | null;
  currentTime: number;
  duration: number;
  playheadTime: number;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onSeekBy: (delta: number) => void;
  onSkipPrev: () => void;
  onSkipNext: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onDurationChange: () => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
}

export default function VideoPlayer({
  videoRef,
  src,
  isPlaying,
  isAdPlaying,
  adTitle,
  currentTime,
  duration,
  playheadTime,
  onTogglePlay,
  onSeek,
  onSeekBy,
  onSkipPrev,
  onSkipNext,
  onJumpStart,
  onJumpEnd,
  onTimeUpdate,
  onLoadedMetadata,
  onDurationChange,
  onEnded,
  onPlay,
  onPause,
}: Props) {
  const pct = duration ? (playheadTime / duration) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onDurationChange={onDurationChange}
          onEnded={onEnded}
          onPlay={onPlay}
          onPause={onPause}
          playsInline
        />
        {isAdPlaying && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold shadow">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            AD · {adTitle}
          </div>
        )}
      </div>

      {/* thin progress bar (drag to seek) */}
      <div className="px-4 pt-3">
        <div className="relative h-1 rounded-full bg-zinc-200">
          <div className="absolute inset-y-0 left-0 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(playheadTime, duration || 0)}
            disabled={isAdPlaying}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-default"
            aria-label="Seek"
          />
        </div>
      </div>
      </div>

      {/* transport bar — its own 64px bordered card, 16px padding, three groups
          spread edge to edge (exact from Figma) */}
      <div className="rounded-2xl border border-zinc-200 bg-white h-16 px-4 flex items-center justify-between text-zinc-700">
        <button onClick={onJumpStart} className="flex items-center gap-2 hover:text-zinc-900" aria-label="Jump to start">
          <span className="w-7 h-7 grid place-items-center rounded-full border border-zinc-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5l-10 7 10 7z" /></svg>
          </span>
          <span className="text-sm whitespace-nowrap">Jump to start</span>
        </button>

        {/* middle five controls — lighter icons, tighter spacing to match his bar */}
        <div className="flex items-center gap-6">
        <button onClick={() => onSeekBy(-10)} className="flex items-center gap-1.5 hover:text-zinc-900" aria-label="Back 10 seconds">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4v5h5" /><path d="M3.5 9a8 8 0 1 1-1 4" /></svg>
          <span className="text-sm">10s</span>
        </button>

        <button onClick={onSkipPrev} className="text-zinc-900 hover:opacity-80" aria-label="Previous marker">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M11 12 19 6v12zM3 12l8-6v12z" /></svg>
        </button>

        <button onClick={onTogglePlay} className="text-zinc-900 hover:opacity-80" aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1.2" /><rect x="13.5" y="5" width="4.5" height="14" rx="1.2" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>
          )}
        </button>

        <button onClick={onSkipNext} className="text-zinc-900 hover:opacity-80" aria-label="Next marker">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M13 12 5 6v12zM21 12l-8-6v12z" /></svg>
        </button>

        <button onClick={() => onSeekBy(10)} className="flex items-center gap-1.5 hover:text-zinc-900" aria-label="Forward 10 seconds">
          <span className="text-sm">10s</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4v5h-5" /><path d="M20.5 9a8 8 0 1 0 1 4" /></svg>
        </button>
        </div>

        <button onClick={onJumpEnd} className="flex items-center gap-2 hover:text-zinc-900" aria-label="Jump to end">
          <span className="text-sm whitespace-nowrap">Jump to end</span>
          <span className="w-7 h-7 grid place-items-center rounded-full border border-zinc-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l10 7-10 7z" /></svg>
          </span>
        </button>
      </div>

      {isAdPlaying && (
        <div className="px-1 text-right text-xs tabular-nums text-zinc-400">
          ad {formatTime(currentTime)}
        </div>
      )}
    </div>
  );
}
