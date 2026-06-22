# Rox — dynamic ads editor

A dynamic-ads page for a podcast platform. You load a video episode, scrub the
timeline, and drop ad markers where ads should play. Each marker has a type that
decides which ad actually fills the slot at playback:

- **static** — always plays one specific ad
- **auto** — plays a random ad from the marker's selected pool
- **ab** — serves one ad per playback to test which performs best (this build
  picks one at random and leaves a clear hook where an impression would be
  logged so variants can be compared later)

Markers are stored in libSQL (via the Turso client) through a small CRUD API.
The editor loads markers on mount and writes every change (add, move, retype,
delete) back to the database, so the DB is the source of truth.

## Stack

Next.js (App Router) + TypeScript + Tailwind. libSQL via `@libsql/client` with
Drizzle ORM for the schema and queries. CRUD runs through Next route handlers.
No state library — the editor is one client component (`app/page.tsx`) holding
React state and refs. Timeline scrubbing and marker dragging use native pointer
events; nothing is pulled in for drag-and-drop.

## Run it locally

```bash
npm install
npm run db:push     # creates ./local.db and the markers table
npm run dev         # http://localhost:3000
```

By default it uses a local libSQL file (`local.db`) so it runs with no external
services or tokens. To point at a real Turso database instead, set these in
`.env.local` and re-run `npm run db:push`:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

Same code path either way — `lib/db.ts` reads the env and falls back to the
local file.

## What's built

- Video player: HTML5 `<video>` driven by React, play/pause, time/duration
  readout, a draggable scrubber that seeks.
- Timeline: a zoomable track with a ruler and a playhead synced to the video.
  Click or drag anywhere on the track to seek (native pointer events).
- Markers: shown both in a list card and as colored blocks on the timeline
  (green Auto, blue Static, amber A/B), added at the playhead, persisted via the
  API and reloaded on mount. Drag a block horizontally to change its time; the
  new time is mapped from pixel delta and saved on drop.
- Create-marker flow: the Create ad marker modal picks the type (Auto / Static /
  A/B). Static and A/B then open an ad-library modal to choose ads; Auto fills
  from the whole pool. An A/B results modal shows the selected variants ranked,
  with a placeholder ranking and a clear note about where logged metrics feed in.
- Automatically place: drops a few Auto markers spread across the episode.
- Spacebar toggles play/pause anywhere on the page (and won't scroll it).
- Timeline zoom changes pixels-per-second with horizontal scroll; markers and
  playhead stay correctly positioned at any zoom.
- Undo/redo: client-side history of marker-set snapshots with a pointer. A
  mutation truncates the redo branch; undo/redo move the pointer and reconcile
  the resulting set back to the server (delete/create/update diffing).
- Skip: jumps the playhead to the next marker, or +10s if there isn't one.
- Ad playback: when the playhead crosses an unplayed marker, the main video
  pauses, the `<video>` src swaps to the marker's ad (chosen by type), the ad
  plays, and on `ended` it swaps back and resumes at the marker time. Played
  markers are tracked per session so it doesn't loop. An ad is also capped at
  `AD_MAX_SECONDS` (15s) so a long clip can't hold playback hostage, the way a
  real ad pod has a maximum slot length.
- Small touches: marker hover scale, a pop animation when a marker is added,
  smooth playhead motion.

## What I left out (time box)

- The UI follows the Figma (light theme, sidebar, marker-list + modal flow,
  pink-waveform timeline with red playhead). The waveform is a CSS texture, not a
  real audio render. Timeline blocks use a fixed visual width since markers are
  point-in-time, not ranges.
- Ads are a fixed seed list in `lib/types.ts`, not a DB table — the brief asks
  to store and retrieve markers, so only markers are persisted. The ad-library
  modal's folder tree and search are visual only.
- A/B testing logs nothing yet; there's a commented hook in `pickAd()` showing
  exactly where an impression write would go.
- No auth, no multi-episode support, no optimistic-update rollback on a failed
  write (writes are assumed to succeed; errors are swallowed). Undo/redo
  reconciliation is a coarse diff, not an operational-transform model.
- The marker label field exists in the schema and API but isn't surfaced in the
  UI beyond defaults.

## Sample media

The brief pointed at Google's `gtv-videos-bucket` sample clips, but that bucket
has since been made private — those URLs now return `AccessDenied` for everyone,
so they can't be used. The app instead serves local files from `/public`, which
also removes any network dependency: `main-video.mp4` plus `ad-1.mp4`,
`ad-2.mp4`, `ad-3.mp4`. `lib/types.ts` points at those paths.

Small sample clips are included in `/public` so it runs out of the box. To
recreate or swap them, run (any small public mp4s work):

```bash
cd public
curl -L -o main-video.mp4 https://media.w3.org/2010/05/sintel/trailer.mp4
curl -L -o ad-1.mp4 https://download.samplelib.com/mp4/sample-5s.mp4
curl -L -o ad-2.mp4 https://download.samplelib.com/mp4/sample-10s.mp4
curl -L -o ad-3.mp4 https://download.samplelib.com/mp4/sample-15s.mp4
```

## Deviations from the brief (deliberate)

- **Component layout.** The brief listed `Toolbar.tsx` and `AdTypePicker.tsx`.
  The Figma has neither — it puts undo/redo and zoom in the timeline header, the
  add/auto-place buttons in a marker-list card, and type/ad selection in modals.
  So that functionality lives in `MarkerList`, the `Timeline` header, and
  `CreateMarkerModal` / `AdLibraryModal` / `ABResultsModal` instead. Same
  behavior, structured to match the design the brief said to follow.
- **Client-supplied marker id.** `POST /api/markers` accepts an optional `id`
  (falling back to a server uuid). The editor generates the id up front so
  optimistic UI and undo/redo — which can re-create a just-deleted marker — keep
  a stable identity instead of spawning duplicates.
- **Sample clips substituted** for the dead Google URLs, as above.

## Bonus work

- **Hosted (bonus 6).** Live at https://rox-dynamic-ads.vercel.app, deployed on
  Vercel with the database on Turso (hosted libSQL). Markers written on the live
  site persist to Turso. The "how and why" is the hosting section below.
- **Real ad injection (bonus 3).** `scripts/render.mjs` is the worker version of
  the playback swap: it reads the markers, cuts the episode at each marker time,
  splices in the chosen ad (capped at 15s like the player), and writes a single
  combined `public/final.mp4` with ffmpeg. Run it with `node scripts/render.mjs`
  (needs ffmpeg + ffprobe). It is deliberately a standalone worker, not an API
  route, because transcoding doesn't belong in a serverless request.
- **Durable execution (bonus 7)** is described in the hosting section: the render
  job runs on a retrying background worker, not inline.

## Hosting and a real streaming/ad pipeline

For deployment, the Next.js app goes on **Vercel** — the route handlers run as
serverless functions and the client is served from Vercel's edge CDN. The
**database** is **Turso** (hosted libSQL), which is just the two env vars above;
no code changes. Static assets and any self-hosted media belong in **object
storage** (S3 or R2) behind a CDN rather than in `/public`.

The swap-the-`<video>`-src trick here is fine for a demo but not how real dynamic
ad insertion works. A production pipeline would look like this. On upload, a
**transcode** step (FFmpeg) produces several quality renditions and segments
each into **HLS** (a manifest plus a few-second `.ts`/`.fmp4` chunks). Ads get
the same treatment so their segments are bitrate- and codec-compatible with the
content. At play time you do **server-side ad insertion**: a manifest
manipulator stitches the ad's segments into the episode manifest as interstitials
at each marker's timestamp, so the player just sees one continuous stream and ad
blockers can't trivially strip a separate request. Everything — content and ad
segments — is served through a **CDN** for reach and cost.

Because transcoding is slow and bursty, the encode/segment/upload work runs on a
**durable workflow runner** (Temporal, AWS Step Functions, or a queue of workers)
with retries and idempotency, not inside a request handler. Ad selection (the
`static`/`auto`/`ab` logic that lives in the client here) moves to an **ad
decision service** that picks a variant per session and logs impressions and
completions, which is what feeds the A/B reporting the `ab` type implies.
