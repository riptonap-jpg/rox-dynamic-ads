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

function CtrlBtn({
  label,
  onClick,
  children,
  big,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        big
          ? "w-11 h-11 grid place-items-center rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          : "w-9 h-9 grid place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
      }
    >
      {children}
    </button>
  );
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
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
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

      {/* thin scrubber (drag to seek) */}
      <div className="px-4 pt-3">
        <div className="relative h-1.5 rounded-full bg-zinc-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-zinc-900"
            style={{ width: `${pct}%` }}
          />
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

      {/* transport */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-3">
        <CtrlBtn label="Jump to start" onClick={onJumpStart}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5l-10 7 10 7z" /></svg>
        </CtrlBtn>
        <CtrlBtn label="Back 10s" onClick={() => onSeekBy(-10)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 8 7 4m0 0 4-4M7 4h6a6 6 0 1 1-6 6" /></svg>
        </CtrlBtn>
        <CtrlBtn label="Previous marker" onClick={onSkipPrev}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11 12 19 6v12zM3 12l8-6v12z" /></svg>
        </CtrlBtn>
        <CtrlBtn label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlay} big>
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </CtrlBtn>
        <CtrlBtn label="Next marker" onClick={onSkipNext}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 12 5 6v12zM21 12l-8-6v12z" /></svg>
        </CtrlBtn>
        <CtrlBtn label="Forward 10s" onClick={() => onSeekBy(10)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m13 8 4-4m0 0-4-4m4 4h-6a6 6 0 1 0 6 6" /></svg>
        </CtrlBtn>
        <CtrlBtn label="Jump to end" onClick={onJumpEnd}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l10 7-10 7z" /></svg>
        </CtrlBtn>

        <span className="ml-3 text-xs tabular-nums text-zinc-400 w-20 text-right">
          {isAdPlaying ? `ad ${formatTime(currentTime)}` : `${formatTime(playheadTime)} / ${formatTime(duration)}`}
        </span>
      </div>
    </div>
  );
}
