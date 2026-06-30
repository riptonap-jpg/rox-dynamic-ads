"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Marker,
  AdType,
  Ad,
  SAMPLE_ADS,
  MAIN_VIDEO_SRC,
  adById,
} from "@/lib/types";
import {
  buildLayout,
  videoToDisplay,
  displayToVideo,
  adDispStart,
  AD_DISPLAY_SECONDS,
} from "@/lib/layout";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import MarkerList from "@/components/MarkerList";
import VideoPlayer from "@/components/VideoPlayer";
import Timeline from "@/components/Timeline";
import CreateMarkerModal from "@/components/CreateMarkerModal";
import AdLibraryModal from "@/components/AdLibraryModal";
import ABResultsModal from "@/components/ABResultsModal";

// cap how long an ad can play before we resume the episode. Matches the ad's
// width on the timeline (AD_DISPLAY_SECONDS) so the playhead reaches the end of
// the ad block exactly as the ad finishes.
const AD_MAX_SECONDS = AD_DISPLAY_SECONDS;

// ---- helpers ---------------------------------------------------------------

function sortMarkers(arr: Marker[]): Marker[] {
  return [...arr].sort((a, b) => a.time - b.time);
}
function cloneMarker(m: Marker): Marker {
  return { ...m, adIds: [...m.adIds] };
}
function markerChanged(a: Marker, b: Marker): boolean {
  return (
    a.time !== b.time ||
    a.type !== b.type ||
    a.label !== b.label ||
    JSON.stringify(a.adIds) !== JSON.stringify(b.adIds)
  );
}

async function apiPost(m: Marker) {
  await fetch("/api/markers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: m.id,
      time: m.time,
      type: m.type,
      adIds: m.adIds,
      label: m.label,
    }),
  });
}
async function apiPut(id: string, patch: Partial<Marker>) {
  await fetch(`/api/markers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}
async function apiDelete(id: string) {
  await fetch(`/api/markers/${id}`, { method: "DELETE" });
}

// ============================================================================

export default function EditorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeSrc, setActiveSrc] = useState(MAIN_VIDEO_SRC);
  const [currentTime, setCurrentTime] = useState(0);
  const [mainDuration, setMainDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adTitle, setAdTitle] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(10); // pixels per second

  // modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [libraryMarkerId, setLibraryMarkerId] = useState<string | null>(null);
  const [resultsMarkerId, setResultsMarkerId] = useState<string | null>(null);

  // ad-playback bookkeeping
  const playedRef = useRef<Set<string>>(new Set());
  const resumeAtRef = useRef(0);
  const playingMarkerRef = useRef<string | null>(null); // marker whose ad is on
  const seekOnLoadRef = useRef<number | null>(null);
  const playOnLoadRef = useRef(false);
  const seededFrameRef = useRef(false); // nudge off the black opening frame once

  // undo/redo history
  const [history, setHistory] = useState<Marker[][]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const histIndexRef = useRef(-1);
  function setHist(i: number) {
    histIndexRef.current = i;
    setHistIndex(i);
  }

  const playheadTime = isAdPlaying ? resumeAtRef.current : currentTime;

  // the displayed timeline (episode cut by ad blocks) and the playhead's
  // position on it. While an ad plays, the playhead travels across the ad block.
  const layout = useMemo(
    () => buildLayout(markers, mainDuration),
    [markers, mainDuration]
  );
  const playheadDisplay = isAdPlaying
    ? adDispStart(layout, playingMarkerRef.current ?? "") +
      Math.min(currentTime, AD_MAX_SECONDS)
    : videoToDisplay(layout, currentTime);

  // click/scrub on the timeline -> episode time
  function seekDisplay(disp: number) {
    seek(displayToVideo(layout, disp));
  }
  // drag an ad block: map its target left edge (in display seconds) back to an
  // episode time, using a layout that excludes the dragged marker so it's stable
  function dragMoveDisplay(id: string, dispStart: number) {
    const lw = buildLayout(
      markers.filter((m) => m.id !== id),
      mainDuration
    );
    const t = Math.max(0, Math.min(displayToVideo(lw, dispStart), mainDuration || dispStart));
    dragMove(id, t);
  }
  function dragEndDisplay(id: string, dispStart: number) {
    const lw = buildLayout(
      markers.filter((m) => m.id !== id),
      mainDuration
    );
    const t = Math.max(0, Math.min(displayToVideo(lw, dispStart), mainDuration || dispStart));
    dragEnd(id, t);
  }

  // dragging the red playhead and releasing it: land in the episode -> seek;
  // land inside an ad block -> open that ad at the dragged offset (paused)
  function scrubCommit(disp: number) {
    for (const s of layout.segments) {
      if (disp >= s.dispStart - 0.001 && disp <= s.dispStart + s.dispDur + 0.001) {
        if (s.kind === "video") {
          seek(s.vStart + (disp - s.dispStart));
        } else {
          enterAdAt(s.marker, Math.min(disp - s.dispStart, AD_MAX_SECONDS - 0.1));
        }
        return;
      }
    }
  }
  // show an ad paused at a given offset (used when scrubbing into an ad block)
  function enterAdAt(m: Marker, offset: number) {
    const v = videoRef.current;
    // already inside this ad: just move the ad's playhead, no reload
    if (isAdPlaying && playingMarkerRef.current === m.id && v) {
      const cap = Math.min(v.duration || AD_MAX_SECONDS, AD_MAX_SECONDS);
      const t = Math.max(0, Math.min(offset, cap));
      v.currentTime = t;
      setCurrentTime(t);
      return;
    }
    const ad = pickAd(m);
    if (!ad) {
      seek(m.time);
      return;
    }
    playedRef.current.add(m.id);
    playingMarkerRef.current = m.id;
    resumeAtRef.current = m.time;
    seekOnLoadRef.current = Math.max(0, offset);
    playOnLoadRef.current = false; // paused; the user can hit play
    setIsAdPlaying(true);
    setAdTitle(ad.title);
    setActiveSrc(ad.src);
    setCurrentTime(Math.max(0, offset));
  }

  // ---- initial load -------------------------------------------------------
  useEffect(() => {
    fetch("/api/markers")
      .then((r) => r.json())
      .then((data: Marker[]) => {
        const sorted = sortMarkers(data);
        setMarkers(sorted);
        setHistory([sorted.map(cloneMarker)]);
        setHist(0);
      })
      .catch(() => {
        setHistory([[]]);
        setHist(0);
      });
  }, []);

  // ---- spacebar play/pause ------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault(); // don't scroll the page
      togglePlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- playback controls --------------------------------------------------
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }
  function seek(t: number) {
    if (isAdPlaying) return;
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(t, mainDuration || t));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }
  function seekBy(delta: number) {
    const v = videoRef.current;
    if (!v) return;
    // while an ad is on screen, the transport scrubs the *ad* clip (so you can
    // rewind/forward inside the ad), clamped to the ad's capped length
    if (isAdPlaying) {
      const cap = Math.min(v.duration || AD_MAX_SECONDS, AD_MAX_SECONDS);
      const t = Math.max(0, Math.min(v.currentTime + delta, cap));
      v.currentTime = t;
      setCurrentTime(t);
      return;
    }
    seek(playheadTime + delta);
  }
  function skipNext() {
    const next = markers
      .filter((m) => m.time > playheadTime + 0.05)
      .sort((a, b) => a.time - b.time)[0];
    seek(next ? next.time : mainDuration);
  }
  function skipPrev() {
    const prev = markers
      .filter((m) => m.time < playheadTime - 0.05)
      .sort((a, b) => b.time - a.time)[0];
    seek(prev ? prev.time : 0);
  }

  function pickAd(m: Marker): Ad | undefined {
    const pool: Ad[] = m.adIds.length
      ? (m.adIds.map(adById).filter(Boolean) as Ad[])
      : SAMPLE_ADS;
    if (pool.length === 0) return undefined;
    if (m.type === "static") return pool[0];
    if (m.type === "auto") return pool[Math.floor(Math.random() * pool.length)];
    // 'ab': serve one variant per playback (random here).
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    // HOOK(perf): record an impression for `chosen.id` at marker `m.id` so
    // completions/clicks can be attributed and variants compared later. A real
    // impl would round-robin or use a bandit instead of pure random.
    return chosen;
  }

  function fireAd(m: Marker) {
    const ad = pickAd(m);
    if (!ad) return;
    playedRef.current.add(m.id);
    playingMarkerRef.current = m.id;
    resumeAtRef.current = m.time;
    seekOnLoadRef.current = 0;
    playOnLoadRef.current = true;
    setIsAdPlaying(true);
    setAdTitle(ad.title);
    setActiveSrc(ad.src);
  }

  // ---- media events -------------------------------------------------------
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

    // while an ad is on screen: resume the episode if it ends or hits the cap
    if (isAdPlaying) {
      if (v.currentTime >= AD_MAX_SECONDS) endAdAndResume();
      return;
    }

    // capture duration as soon as it's known (some files report it lazily)
    if (
      activeSrc === MAIN_VIDEO_SRC &&
      (mainDuration <= 0 || !isFinite(mainDuration)) &&
      isFinite(v.duration) &&
      v.duration > 0
    ) {
      setMainDuration(v.duration);
    }
    if (activeSrc !== MAIN_VIDEO_SRC) return;
    for (const m of markers) {
      if (
        !playedRef.current.has(m.id) &&
        v.currentTime >= m.time &&
        v.currentTime <= m.time + 1.5
      ) {
        fireAd(m);
        break;
      }
    }
  }
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    if (activeSrc === MAIN_VIDEO_SRC && isFinite(v.duration) && v.duration > 0) {
      setMainDuration(v.duration);
    }
    // first main load: jump a few seconds in so we paint a real frame instead
    // of the video's black opening (acts as a poster)
    if (
      activeSrc === MAIN_VIDEO_SRC &&
      !seededFrameRef.current &&
      seekOnLoadRef.current == null &&
      !playOnLoadRef.current
    ) {
      seededFrameRef.current = true;
      const t = Math.min(6, v.duration || 6);
      v.currentTime = t;
      setCurrentTime(t);
    }
    if (seekOnLoadRef.current != null) {
      try {
        v.currentTime = seekOnLoadRef.current;
      } catch {
        /* ignore */
      }
      seekOnLoadRef.current = null;
    }
    if (playOnLoadRef.current) {
      playOnLoadRef.current = false;
      v.play().catch(() => {});
    }
  }
  // Some MP4s report their length a moment after metadata loads; capture it
  // whenever the browser figures it out so the timeline can size correctly.
  function handleDurationChange() {
    const v = videoRef.current;
    if (!v) return;
    if (activeSrc === MAIN_VIDEO_SRC && isFinite(v.duration) && v.duration > 0) {
      setMainDuration(v.duration);
    }
  }

  // swap back to the episode and resume at the marker time
  function endAdAndResume() {
    seekOnLoadRef.current = resumeAtRef.current;
    playOnLoadRef.current = true;
    playingMarkerRef.current = null;
    setIsAdPlaying(false);
    setAdTitle(null);
    setActiveSrc(MAIN_VIDEO_SRC);
  }

  function handleEnded() {
    if (isAdPlaying) endAdAndResume();
    else setIsPlaying(false);
  }

  // ---- history ------------------------------------------------------------
  function pushHistory(next: Marker[]) {
    const base = history.slice(0, histIndexRef.current + 1);
    const nh = [...base, next.map(cloneMarker)];
    setHistory(nh);
    setHist(nh.length - 1);
  }
  function reconcile(prev: Marker[], target: Marker[]) {
    const prevById = new Map(prev.map((m) => [m.id, m]));
    const targetById = new Map(target.map((m) => [m.id, m]));
    for (const m of prev) {
      if (!targetById.has(m.id)) apiDelete(m.id).catch(() => {});
    }
    for (const m of target) {
      if (!prevById.has(m.id)) apiPost(m).catch(() => {});
    }
    for (const m of target) {
      const p = prevById.get(m.id);
      if (p && markerChanged(p, m)) {
        apiPut(m.id, {
          time: m.time,
          type: m.type,
          adIds: m.adIds,
          label: m.label,
        }).catch(() => {});
      }
    }
  }
  function undo() {
    if (histIndexRef.current <= 0) return;
    const prev = markers;
    const target = history[histIndexRef.current - 1];
    setHist(histIndexRef.current - 1);
    setMarkers(target.map(cloneMarker));
    setSelectedMarkerId(null);
    reconcile(prev, target);
  }
  function redo() {
    if (histIndexRef.current >= history.length - 1) return;
    const prev = markers;
    const target = history[histIndexRef.current + 1];
    setHist(histIndexRef.current + 1);
    setMarkers(target.map(cloneMarker));
    setSelectedMarkerId(null);
    reconcile(prev, target);
  }

  // ---- marker mutations ---------------------------------------------------
  function createWithType(type: AdType) {
    const time = isAdPlaying
      ? resumeAtRef.current
      : videoRef.current?.currentTime ?? 0;
    const m: Marker = {
      id: crypto.randomUUID(),
      time,
      // auto starts with the whole pool; static/ab start empty and the user
      // picks ads in the library modal that opens next
      type,
      adIds: type === "auto" ? SAMPLE_ADS.map((a) => a.id) : [],
      label: "",
      createdAt: Date.now(),
    };
    const next = sortMarkers([...markers, m]);
    setMarkers(next);
    setSelectedMarkerId(m.id);
    setJustAddedId(m.id);
    setTimeout(() => setJustAddedId(null), 320);
    pushHistory(next);
    apiPost(m).catch(() => {});

    setCreateOpen(false);
    if (type !== "auto") setLibraryMarkerId(m.id); // go pick ads
  }

  function saveLibrary(adIds: string[]) {
    const id = libraryMarkerId;
    if (!id) return;
    const next = markers.map((m) => (m.id === id ? { ...m, adIds } : m));
    setMarkers(next);
    pushHistory(next);
    apiPut(id, { adIds }).catch(() => {});
    setLibraryMarkerId(null);
  }

  function deleteMarker(id: string) {
    const next = markers.filter((m) => m.id !== id);
    setMarkers(next);
    if (selectedMarkerId === id) setSelectedMarkerId(null);
    pushHistory(next);
    apiDelete(id).catch(() => {});
  }

  function dragMove(id: string, time: number) {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, time } : m)));
  }
  function dragEnd(id: string, time: number) {
    const next = sortMarkers(
      markers.map((m) => (m.id === id ? { ...m, time } : m))
    );
    setMarkers(next);
    pushHistory(next);
    apiPut(id, { time }).catch(() => {});
  }

  // spread a few auto markers across the episode
  function autoPlace() {
    if (!mainDuration) return;
    const added: Marker[] = [0.2, 0.5, 0.8].map((f) => ({
      id: crypto.randomUUID(),
      time: Math.round(mainDuration * f),
      type: "auto" as AdType,
      adIds: SAMPLE_ADS.map((a) => a.id),
      label: "",
      createdAt: Date.now(),
    }));
    const next = sortMarkers([...markers, ...added]);
    setMarkers(next);
    pushHistory(next);
    added.forEach((m) => apiPost(m).catch(() => {}));
  }

  const libraryMarker = markers.find((m) => m.id === libraryMarkerId) ?? null;
  const resultsMarker = markers.find((m) => m.id === resultsMarkerId) ?? null;

  // ---- render -------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <button className="text-sm text-zinc-500 hover:text-zinc-800 mb-3 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              Ads
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 max-w-3xl">
              The Longevity Expert: The Truth About Ozempic, The Magic Weight
              Loss Drug &amp; The Link Between Milk &amp; Cancer!
            </h1>
            <p className="text-sm text-zinc-500 mt-1 mb-5">
              Episode 503 · 12 April 2024
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_1.4fr] gap-5 items-start">
              <MarkerList
                markers={markers}
                selectedId={selectedMarkerId}
                onCreate={() => setCreateOpen(true)}
                onAutoPlace={autoPlace}
                onEdit={(id) => setLibraryMarkerId(id)}
                onDelete={deleteMarker}
                onResults={(id) => setResultsMarkerId(id)}
                onSelect={(id) => {
                  setSelectedMarkerId(id);
                  const m = markers.find((x) => x.id === id);
                  if (m) seek(m.time);
                }}
              />
              <VideoPlayer
                videoRef={videoRef}
                src={activeSrc}
                isPlaying={isPlaying}
                isAdPlaying={isAdPlaying}
                adTitle={adTitle}
                currentTime={currentTime}
                duration={mainDuration}
                playheadTime={playheadTime}
                onTogglePlay={togglePlay}
                onSeek={seek}
                onSeekBy={seekBy}
                onSkipPrev={skipPrev}
                onSkipNext={skipNext}
                onJumpStart={() => seek(0)}
                onJumpEnd={() => seek(mainDuration)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>

            <div className="mt-5">
              <Timeline
                layout={layout}
                pixelsPerSecond={zoom}
                zoom={zoom}
                playheadDisplay={playheadDisplay}
                markers={markers}
                selectedMarkerId={selectedMarkerId}
                playedIds={playedRef.current}
                justAddedId={justAddedId}
                canUndo={histIndex > 0}
                canRedo={histIndex < history.length - 1}
                onUndo={undo}
                onRedo={redo}
                onZoomChange={setZoom}
                onSeekDisplay={seekDisplay}
                onScrubCommit={scrubCommit}
                onEditTimeDisplay={seekDisplay}
                onSelectMarker={(id) => setSelectedMarkerId(id)}
                onDragMoveDisplay={dragMoveDisplay}
                onDragEndDisplay={dragEndDisplay}
              />
            </div>

            <div className="flex items-center justify-between mt-8 pt-8 border-t border-zinc-200 text-sm text-zinc-400">
              <span>Video first podcasts</span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3 L21 19 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                Vidpod
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* modals */}
      {createOpen && (
        <CreateMarkerModal
          onClose={() => setCreateOpen(false)}
          onConfirm={createWithType}
        />
      )}
      {libraryMarker && (
        <AdLibraryModal
          marker={libraryMarker}
          onClose={() => setLibraryMarkerId(null)}
          onSave={saveLibrary}
        />
      )}
      {resultsMarker && (
        <ABResultsModal
          marker={resultsMarker}
          onClose={() => setResultsMarkerId(null)}
          onNewTest={() => {
            setResultsMarkerId(null);
            setLibraryMarkerId(resultsMarker.id);
          }}
        />
      )}
    </div>
  );
}
