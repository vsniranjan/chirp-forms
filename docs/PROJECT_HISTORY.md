# Chirp project history

Archived decisions and session notes from the original agent guide. These record the project
changing direction; they are historical context, not current instructions or current feature claims.
For current guidance, read [AGENTS.md](../AGENTS.md). For current status, read
[README.md](../README.md). Historical measurements and test outcomes apply only to their
recorded versions.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-24 | Idea: forms over sound (not QR, not Bluetooth) | Only channel that is one-to-many, no pairing, rides on any audio path |
| 2026-10-24 | Target user: disaster-relief crews | Strongest story for "no network"; keeps pitch specific |
| 2026-10-24 | Android-only demo | Fewer audio quirks; iOS Safari untested |
| 2026-10-24 | Vanilla JS + Vite, no backend | Minimal surface; "static page" reinforces offline story |
| 2026-10-24 | First wow feature: loudspeaker broadcast | Lowest effort, biggest reaction; it is just audio out |
| 2026-10-24 | Binary frames, no base64 | Measured binary-safe; bytes are precious at 7 B/s |
| 2026-10-24 | Demo returns 1–2 entries, not 10 | Keeps the live demo snappy; multi-entry still works (chunked) |
| 2026-10-24 | 6 B frame header instead of planned 8 B | ggwave gives exact length; chunk idx/count fit in one byte |
| 2026-10-24 | Default protocol AUDIBLE_NORMAL | Corrected airtimes make the most robust protocol cheap (~3 s/msg) |
| 2026-10-24 | Only the `ack:true` subscriber ACKs | Prevents every nearby worker answering a worker's entries |
| 2026-10-24 | No images / sketches for now | Human decision: focus on what can be demoed to judges. Prototype discarded uncommitted. |
| 2026-10-24 | Per-phone language, answers stay English | Best answer to "why not just announce it on a loudspeaker?": voice can't collect data back or translate per listener |
| 2026-10-24 | Pitch leads with collecting answers, not broadcast | A loudspeaker voice already does one-way broadcast; the return path is the unique value |

## Session log

### 2026-10-24 — session 1 (Devin)
- Done: idea selection and judge stress-test; `PLAN.md`; Vite scaffold; `ggwave` installed;
  Node loopback spikes with measurements; `src/audio/ggwave.js` radio wrapper; M0 link-test page
  (`src/main.js`) with protocol/size/volume controls, byte-exact verification, OK/CORRUPT log;
  HTTPS dev server; git init + first commit.
- Half-done: nothing uncommitted.
- Waiting on human: phone-to-phone results (success rate at 0.5 m / 2 m for FASTEST and FAST,
  32 B and 128 B; phone models). Fill the "Phone-to-phone over air" table in PLAN.md.
- Next step: **M1** — create `src/protocol/frame.js` (8 B header: magic, type, msgId u16,
  chunkIdx, chunkCount, len, crc8), `src/protocol/chunker.js` (split/reassemble, ACK bitmap,
  retransmit plan), `src/protocol/codec.js` (form schema <-> bytes with label dictionary in
  `src/presets.js`; entries <-> bytes). Add Vitest and round-trip tests. Then wire a "send 300 B
  with retransmit" test into the link page.
- Open question: if FASTEST fails often at 2 m on the real phones, switch default to FAST and
  shrink the preset form to <= 6 fields with dictionary-only labels.

### 2026-10-24 — session 2 (Devin)
- User confirmed phone-to-phone chirp works on the link-test page (M0 done).
- Found and fixed a 4x airtime error in the M0 spike (F32 samples counted as bytes). Corrected
  numbers in Hard facts / PLAN. Default protocol switched to AUDIBLE_NORMAL.
- M1 done: frame (6 B header), codec (preset form = 13 B), chunker, link (ACK/retransmit, only
  `ack:true` subscriber replies). 29 Vitest tests.
- M2 + M3 done: supervisor builder/broadcast/results/CSV, worker receive/fill/save/send, diag
  screen, router with tap-to-start gate, wake lock. `npm run smoke` passes 20/20 checks including
  real chirps decoded through Chrome's fake mic in both directions.
- Half-done: nothing uncommitted.
- Waiting on human: **real two-phone run of the full flow** — phone A `#/supervisor` -> Broadcast;
  phone B `#/worker` receives -> save entry -> Send; confirm row appears on A and B shows
  "Delivered". Also try covering B's mic mid-send to see a retry. Report any failures.
- Next step: **M4 speaker mode** — `src/audio/speaker.js`: render the FORM chirp to a downloadable
  WAV (reuse the WAV writer in `scripts/smoke.mjs`), "Download chirp .wav" button in supervisor,
  and a "loud" preset (volume 100, repeat x2). Then M5: PWA manifest + service worker so the app
  loads with no network, big OFFLINE badge, demo reset.

### 2026-10-24 — session 2b (Devin)
- Adopted the organizers' template (github.com/anima-regem/devday-kochi-hackathon-template):
  added RULES.md (verbatim), PR template, README/CHANGELOG/AI_USAGE/SUBMISSION filled with real
  data, merged template agent guide into this file as Part 1. Screenshots deferred by the human.
- Repo: `origin` = `git@github.com:vsniranjan/chirp-forms.git` (SSH works on this machine),
  branch `main`, template initial commit merged. Solo participant: Niranjan (@vsniranjan).
  Push after every commit: `git push`. Never force-push.
- Next step: continue M4 (speaker mode). Screenshots for the repo deferred; add later under
  `docs/screenshots/`.

### 2026-10-24 — session 2c (Devin)
- Built per-phone language (en/ml/hi) for the worker; values stay canonical English. Smoke 25/25.
- Discarded (uncommitted, never pushed) sketch/photo prototype at the human's request.
- Waiting on human: (1) real two-phone run of the full flow; (2) a native check of the Malayalam
  strings in `src/i18n.js`.
- Next step, in the human's priority order: **M5 offline PWA** (reload works in airplane mode),
  then **M4 loudspeaker + .wav**, then roll-call only if time allows. No image work.

### 2026-10-24 — session 3 (Codex)
- Human approved the one-way saved-information plan, then explicitly said not to run demos/checks;
  they will check later. This overrides the usual test-before-commit convention for this change.
- Implemented: new primary `#/broadcast` and `#/saved` screens, four categories, editor/statuses,
  optional coordinates/phone/hours, live byte/airtime display, persistent source/record/version
  identities, newer-only updates with visible card changes, offline search/filter/map/contact actions.
- Existing supervisor/worker forms remain behind a secondary home link. Added production precache,
  readiness feedback, manifest, and separate preview port 5174. No new dependencies.
- Added unit and real-chirp smoke scenarios, including replay/closure and optional offline reload.
  **No tests, build, browser demo or real-phone checks were run.** Do not inherit old passing counts
  as evidence for this version. Transmitted information is not automatically translated/authenticated.
- Next: human checks the water-card create -> hours update -> closure -> old replay -> offline search
  flow; run documented checks when authorized. Phone PWA needs trusted HTTPS; local self-signed dev
  loading alone does not establish offline readiness. WAV/loudspeaker export remains deferred.

### 2026-10-24 — session 4 (Codex)
- Human confirmed the information feature works, then requested a lighter, friendlier UI with less
  text and icons. Exact prior test coverage was not supplied; don't assume offline/range results.
- Implemented light warm-white/teal styling, local SVG icons, Chirp app bar and home role cards,
  a collapsible sender editor with optional fields, simpler information cards with metadata under
  More details, and a clearer listening/search view. Offline readiness now says “Available offline”.
- No protocol, storage or dependency changes. Existing forms inherit the light theme and remain
  secondary. No tests/build/browser previews/demo runs, respecting the human's standing preference.
- Next: human reviews the new UI on phones; continue from their feedback. Note that saving now
  closes the editor; Edit/New card reopens it. New icons live in `src/ui/icons.js`.

### 2026-10-25 — manual verification report (recorded by Codex)
- Human confirmed broadcast reception, sending two different cards, then updating the first card
  after sending the second. Correct data was received on the client in all reported cases.
- Updated status docs only; no implementation changes or agent-run checks. Device models,
  distance, airplane mode/offline reload, closure/replay tests and detailed UI review were not reported.
- Remaining: coordinator signatures/trust setup are discussed only, not implemented. Offline/replay
  and automated checks still need their own evidence; don't expand this manual report into those claims.

### 2026-10-25 — offline delivery follow-up (Codex)
- Human reported Dino screen after disabling Wi-Fi and reloading `https://10.10.19.163:5173/#/saved`.
  This was the uncached dev origin. Human asked to make it work, not merely add a warning.
- Production build completed. Prepared Sites project `appgprj_6add1dbe81ec8191919c6a875d069c0e`
  (`.openai/hosting.json`) with public access explicitly chosen by the human. Intended production
  URL: `https://chirp-offline-relief.socialmacaw16.chatgpt.site/`; native deployment result confirms live state.
- Added a dev-page link to the production copy and made offline readiness wait for actual page
  control. Old local-origin cards do not migrate automatically; they can be broadcast to new-origin receivers.
- No automated tests/phone demo; build was necessary to produce deployable assets. Next: human loads
  hosted URL online, waits for Available offline, disconnects and reloads. Signatures still not built.

