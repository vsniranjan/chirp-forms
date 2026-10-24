# AGENTS.md — Chirp Forms

Read this first. It is the shared memory for every agent (Devin, Codex, Cursor, human) working on
this repo. Work may be handed off mid-task when a session hits usage limits, so keep this file and
`PLAN.md` accurate enough that a fresh agent with zero context can continue in under 5 minutes.

## What we are building (one paragraph)

**Chirp Forms** — a static PWA that sends small forms between phones using *sound* (ggwave FSK
modem over speaker/mic). A supervisor broadcasts a form with one chirp; every phone in earshot
receives it; workers fill entries offline; entries chirp back; supervisor merges and exports CSV.
No internet, no Bluetooth pairing, no app install. Hackathon entry for the **"Works Anyway"** track
(constraint: no network). Target user story: **disaster-relief crews**. Demo: every phone in
airplane mode + a chirp through a loudspeaker reaching phones across the room.

Why sound over QR (judges WILL ask): one-to-many in a single chirp, no line of sight / aiming,
rides on any audio channel (PA, Bluetooth speaker, voice note). Say upfront that ggwave is the
modem; our work is the protocol (chunking, ACK/retry, compact codec) and the product.

## Files you must know

| Path | Purpose |
|---|---|
| `AGENTS.md` | This file. How to work, current status, handoff log. |
| `PLAN.md` | What to build: constraints, protocol spec, milestones (checkboxes), measurements, demo script, risks. |
| `chirp-forms/` | The app. Vite + vanilla JS + `ggwave` npm (WASM). No backend. |
| `chirp-forms/src/audio/ggwave.js` | `createRadio()` — half-duplex send/listen wrapper around ggwave. Done. |
| `chirp-forms/src/main.js` | Currently the M0 link-test page. Will become role router (supervisor/worker) in M2/M3. |
| `chirp-forms/scripts/spike-*.cjs` | Node loopback spikes used to measure throughput. Keep; rerun if protocol params change. |

Planned layout (see PLAN.md "Project structure"): `src/protocol/{frame,chunker,codec}.js`,
`src/ui/{supervisor,worker,components}.js`, `src/store.js`, `src/presets.js`, `src/audio/speaker.js`.

## Commands

```bash
cd chirp-forms
npm install                      # once
npm run dev                      # HTTPS dev server on https://<LAN-IP>:5173 (self-signed cert; accept on phone)
npm run build && npm run preview # production build check
node scripts/spike-loopback.cjs  # airtime / effective B/s per protocol (no audio hardware needed)
node scripts/spike-chunked.cjs   # browser-like 1024-sample chunked decode check
npm test                         # Vitest (added in M1; unit tests live next to source as *.test.js)
```

Phones must be on the same Wi-Fi as the dev machine. Mic requires HTTPS (hence basic-ssl plugin).
Windows dev machine; shell is Git Bash. Node 24, npm 11.

## Hard facts (measured, do not re-derive)

- ggwave JS `encode`/`decode` are **binary-safe** with `Uint8Array` (embind std::string). No base64.
- Max payload per transmission: **140 bytes**. Our frames use <=128 B payload + 8 B header.
- Effective throughput incl. ECC + markers (the only number that matters):
  `AUDIBLE_FASTEST` ~7 B/s (128 B = 18 s), `AUDIBLE_FAST` ~3.8 B/s (128 B = 34 s). ~4 s fixed cost
  per transmission, so one fuller chunk beats two small ones.
- Decoder output is a view into a static buffer — **copy it immediately** (`Uint8Array.from`).
- Encoder output likewise — `createRadio().encode` already copies.
- A phone must not decode while it transmits (half-duplex). `createRadio` mutes Rx during Tx.
- Mic constraints: `echoCancellation:false, autoGainControl:false, noiseSuppression:false`.
- Audible band is 1875–6375 Hz: survives speakers/PA; will NOT survive narrowband phone calls.

Budgets derived from these: form broadcast <= ~55 B (<= 10 s); one entry <= ~25 B (<= 6 s).
Dictionary label codes (1 B/field) are mandatory. Literal labels <= 6 chars.

## Conventions

- Vanilla JS ES modules, no framework, no TypeScript. 2-space indent, single quotes, semicolons.
- Small modules with one job. Protocol code (`src/protocol/*`) must be pure (no DOM, no audio) so
  it is unit-testable in Node with Vitest.
- Do not add dependencies without a reason written in PLAN.md. Current deps: `ggwave`, dev:
  `vite`, `@vitejs/plugin-basic-ssl`, (M1+) `vitest`.
- Do not add comments explaining *what*; only *why* when non-obvious.
- Commit after each milestone or meaningful sub-step. Message style: imperative subject, body
  explains why. Do not push unless asked.
- UI must be thumb-friendly and readable from a projector: big buttons, dark theme, high contrast.
  Show the OFFLINE badge prominently — the constraint is the demo.
- Default protocol for the demo is `AUDIBLE_FASTEST`; `AUDIBLE_FAST` is the noisy-room fallback.
  Keep the protocol selectable in a settings corner.

## Handoff protocol (every agent, every session)

1. **Start:** read this file, then `PLAN.md`. Check the milestone checkboxes and the Session log
   below. Run `git log --oneline -10` and `git status`.
2. **Work:** tick milestone checkboxes in `PLAN.md` as you complete them. Record any new measured
   fact in "Hard facts" above or in PLAN.md "M0 measurements".
3. **Before stopping (or when you suspect limits are near):** commit, then append a Session log
   entry below with: what was done, what is half-done (file + function), exact next step, open
   questions for the human. Keep entries short; newest at the bottom.
4. Never leave uncommitted work at the end of a session without describing it in the log.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-24 | Idea: forms over sound (not QR, not Bluetooth) | Only channel that is one-to-many, no pairing, rides on any audio path |
| 2026-10-24 | Target user: disaster-relief crews | Strongest story for "no network"; keeps pitch specific |
| 2026-10-24 | Android-only demo | Fewer audio quirks; iOS Safari untested |
| 2026-10-24 | Vanilla JS + Vite, no backend | Minimal surface; "static page" reinforces offline story |
| 2026-10-24 | First wow feature: loudspeaker broadcast | Lowest effort, biggest reaction; it is just audio out |
| 2026-10-24 | Binary frames, no base64 | Measured binary-safe; bytes are precious at 7 B/s |
| 2026-10-24 | Demo returns 1–2 entries, not 10 | 10 entries would take minutes at measured rates |

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
