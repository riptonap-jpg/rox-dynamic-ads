// Bonus 3: server-side dynamic ad injection (the real version).
//
// Reads the ad markers from the database, cuts the main episode at each marker
// time, splices in the chosen ad (capped at 15s, matching the player's cap),
// and writes one combined file to public/final.mp4.
//
// This is the "worker" version of what the live app fakes by swapping the
// <video> src at runtime. It is intentionally NOT wired into the Next.js app:
// transcoding video is slow and memory-heavy and has no business inside a
// serverless request. In production this runs on a durable background worker
// (see the hosting section of the README, bonus 7) triggered after markers
// change.
//
// Requires ffmpeg + ffprobe on PATH:
//   node scripts/render.mjs
// Uses the same env as the app (TURSO_*), or the local libSQL file by default.

import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PUBLIC = "public";
const MAIN = join(PUBLIC, "main-video.mp4");
const OUT = join(PUBLIC, "final.mp4");
const AD_MAX = 15; // keep in sync with AD_MAX_SECONDS in app/page.tsx

// ad id -> file in /public (mirrors SAMPLE_ADS in lib/types.ts)
const AD_FILE = {
  "ad-eightsleep-v1": join(PUBLIC, "ad-1.mp4"),
  "ad-eightsleep-v2": join(PUBLIC, "ad-2.mp4"),
  "ad-brilliant": join(PUBLIC, "ad-3.mp4"),
};
const ALL_ADS = Object.keys(AD_FILE);

// normalize every piece to the same size / fps / sar so they concat cleanly
const NORMALIZE =
  "scale=1280:720:force_original_aspect_ratio=decrease," +
  "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30";

function ffmpeg(args) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", ...args],
    { stdio: "inherit" }
  );
  if (r.status !== 0) throw new Error("ffmpeg failed:\n  " + args.join(" "));
}
function probeDuration(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" }
  );
  return parseFloat(r.stdout.trim()) || 0;
}
function hasAudio(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file],
    { encoding: "utf8" }
  );
  return r.stdout.trim().length > 0;
}

// which ad actually plays at this marker, by type
function pickAd(marker) {
  const pool = marker.adIds.length
    ? marker.adIds.filter((id) => AD_FILE[id])
    : ALL_ADS;
  if (!pool.length) return null;
  if (marker.type === "static") return pool[0];
  if (marker.type === "auto") return pool[Math.floor(Math.random() * pool.length)];
  // 'ab': serve one variant per render. HOOK(perf): a real impl logs which
  // variant served here so completion / CTR can be attributed per variant.
  return pool[Math.floor(Math.random() * pool.length)];
}

// encode `dur` seconds of `src` starting at `start` into a normalized mpegts
// piece. Adds a silent track when the source has no audio so the streams line
// up for concatenation.
function encodePiece(src, outTs, start, dur) {
  const audio = hasAudio(src);
  const args = ["-ss", String(start), "-i", src];
  if (!audio) args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
  args.push(
    "-t", String(dur),
    "-vf", NORMALIZE,
    "-map", "0:v:0",
    "-map", audio ? "0:a:0" : "1:a:0",
    "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-ar", "48000", "-ac", "2",
    "-shortest",
    "-f", "mpegts",
    outTs
  );
  ffmpeg(args);
}

async function main() {
  if (!existsSync(MAIN)) {
    throw new Error(`missing ${MAIN} — populate /public first (see README).`);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const res = await db.execute(
    "select id, time, type, ad_ids as adIds from markers order by time asc"
  );
  const markers = res.rows.map((r) => ({
    id: r.id,
    time: Number(r.time),
    type: r.type,
    adIds: JSON.parse(r.adIds || "[]"),
  }));

  if (!markers.length) {
    console.log("No markers in the database — add some in the app, then re-run.");
    return;
  }

  const total = probeDuration(MAIN);
  const tmp = mkdtempSync(join(tmpdir(), "rox-render-"));
  const pieces = [];
  let cursor = 0;
  let i = 0;

  for (const m of markers) {
    const t = Math.min(Math.max(m.time, 0), total);
    // main episode segment up to this marker
    if (t > cursor + 0.05) {
      const seg = join(tmp, `seg${i}.ts`);
      encodePiece(MAIN, seg, cursor, t - cursor);
      pieces.push(seg);
    }
    // the ad at this marker
    const adId = pickAd(m);
    if (adId) {
      const adTs = join(tmp, `ad${i}.ts`);
      const adDur = Math.min(probeDuration(AD_FILE[adId]), AD_MAX);
      encodePiece(AD_FILE[adId], adTs, 0, adDur);
      pieces.push(adTs);
      console.log(`  marker @ ${t.toFixed(1)}s (${m.type}) -> ${adId} (${adDur.toFixed(0)}s)`);
    }
    cursor = t;
    i++;
  }
  // remaining episode after the last marker
  if (total > cursor + 0.05) {
    const seg = join(tmp, `seg${i}.ts`);
    encodePiece(MAIN, seg, cursor, total - cursor);
    pieces.push(seg);
  }

  // stitch the normalized pieces into the final mp4
  ffmpeg(["-i", `concat:${pieces.join("|")}`, "-c", "copy", "-movflags", "+faststart", OUT]);
  rmSync(tmp, { recursive: true, force: true });

  console.log(`\nWrote ${OUT} — ${pieces.length} pieces, ${probeDuration(OUT).toFixed(1)}s total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
