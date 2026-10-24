# AGENTS.md — Chirp Forms

Read this first. It is the shared memory for every agent (Devin, Codex, Cursor, human) working on
this repo. Work may be handed off mid-task when a session hits usage limits, so keep this file and
`PLAN.md` accurate enough that a fresh agent with zero context can continue in under 5 minutes.

Part 1 is the hackathon template's agent guide (event workflow rules, kept as provided, including
the organizer's 2026-10-24 correction to **Devin Hack Kochi**: no major AI usage constraints,
Devin is allowed). Part 2 is this project's memory: what we're building, hard facts, conventions,
handoff log.

---

# Part 1 — Hackathon agent guide (from the event template)

## Event requirements

- Read [RULES.md](RULES.md) before working. Follow the Devin Hack Kochi organizers' current project-start and eligibility instructions.
- Libraries, APIs, and public datasets are allowed. Document their sources and use.
- Devin Hack Kochi has no major AI usage constraints. Choose suitable AI tools and providers; Codex is not required. If maintaining [AI_USAGE.md](AI_USAGE.md), record actual assistance accurately.
- Prepare a code repository, short project description, and working demo in [SUBMISSION.md](SUBMISSION.md).

## Use basic coding patterns

- Prefer straightforward, idiomatic code: small functions, clear names, simple data structures, and modules with one clear responsibility.
- Use the project's existing patterns. Add an abstraction only when an actual repeated need makes the code easier to understand.
- Choose the simplest implementation that meets the current requirement. Avoid unnecessary layers, generic frameworks, premature optimization, and speculative features.
- Keep dependencies few and purposeful. Reuse appropriate standard libraries and established libraries instead of reimplementing them.
- Validate inputs, handle errors explicitly, and show useful failure messages. Do not hide failures behind fabricated success or demo data.
- Keep changes focused. Explain the reason for non-obvious decisions in short comments or project documentation.

## Document every meaningful change

- Update [CHANGELOG.md](CHANGELOG.md) in the same commit as each meaningful change. Record the date and time with timezone, what changed, why, the affected files or feature, validation performed, and known limitations.
- Update [README.md](README.md) whenever setup, commands, environment requirements, project behavior, or demo instructions change.
- If maintaining [AI_USAGE.md](AI_USAGE.md), update it whenever an AI tool makes a meaningful contribution. Record the task, assistance, human review status, checks, and any corrections. Brief summaries are enough; full chat transcripts are unnecessary.
- Keep claims accurate. Distinguish implemented and verified behavior from planned or incomplete work. Never invent test results, deployment success, AI usage, or commit timestamps.

## Make regular, timely commits

1. Inspect `git status` before editing. Preserve teammates' work and identify files belonging to the current task.
2. Finish a small, coherent change, run appropriate checks, and update its documentation.
3. Review the diff and explicitly stage only the files for that change.
4. **Commit after each completed milestone. While actively building, aim for a commit about every 30 minutes when meaningful changes are ready.** Do not leave the entire night's work for one final commit.
5. Commit completed work before a handoff, a long break, or the end of a work session. If work is incomplete, document its state and use an honest `wip:` message for a useful checkpoint.
6. Use short, descriptive messages, such as `feat: add project search`, `fix: handle empty results`, or `docs: explain local demo setup`.
7. Do not create empty commits to satisfy the clock. Do not backdate commits, squash away the event development record, force-push, or rewrite shared history.
8. Push committed checkpoints to the team's repository regularly, when network access is available and the team has authorized that remote. Resolve conflicts with care.

The 30-minute target is this repository's working convention. It does not replace event rules or organizer instructions.

## Check work and protect credentials

- Use the project's actual install, run, lint, test, and build commands. Add them to the README as soon as they exist; this template does not prescribe a stack.
- Run checks appropriate to the change. For a documentation-only change, check links and consistency. For code changes, verify the changed behavior and any relevant existing tests.
- Report what ran and what passed, failed, or could not be checked. If a command fails, investigate or document the limitation before handoff.
- Keep credentials, API keys, approved QR codes, and private participant data out of commits and logs. Use environment variables and sanitized examples; never put live keys in `.env.example`.

## Before submission

- Complete [SUBMISSION.md](SUBMISSION.md), replacing all participant placeholders.
- Confirm the README gives reproducible setup and demo steps.
- Check that the working demo matches the submitted code and that known limitations are disclosed.
- Update the changelog and any maintained AI usage record, commit the final coherent change, and push it.
- Record the final submitted commit SHA in the submission details. Documentation may record that SHA in a subsequent commit; do not claim later implementation changes belong to the earlier demo.
- Follow the organizers' actual submission method and timing. Use the Devin Hack Kochi organizers' current deadline.

---

# Part 2 — Project memory: Chirp Forms

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
| `README.md` | Public project overview, run steps, status (template-required). Keep in sync with reality. |
| `CHANGELOG.md` / `AI_USAGE.md` | Template-required dev record and AI usage log. Update with each meaningful commit. |
| `SUBMISSION.md` / `RULES.md` | Template submission checklist / event rules (RULES.md is verbatim, don't edit). |
| `chirp-forms/` | The app. Vite + vanilla JS + `ggwave` npm (WASM). No backend. |
| `chirp-forms/src/audio/ggwave.js` | `createRadio()` — half-duplex send/listen wrapper around ggwave. |
| `chirp-forms/src/protocol/frame.js` | 6 B frame header, CRC-8, `MsgType`. Pure. |
| `chirp-forms/src/protocol/codec.js` | Form/entries <-> bytes (layouts documented at top of file). Pure. |
| `chirp-forms/src/protocol/chunker.js` | `split`, `Reassembler`, ACK bitmaps. Pure. |
| `chirp-forms/src/protocol/link.js` | `createLink(radio)`: `broadcast`, `sendReliable` (ACK/retransmit), `on(type, h, {ack})`. |
| `chirp-forms/src/presets.js` | Shared label dictionary (**append only**) + Rapid Needs preset form. |
| `chirp-forms/src/store.js` | localStorage: settings, deviceId, supervisor/worker state. |
| `chirp-forms/src/i18n.js` | Worker-side translations (en/ml/hi) keyed by canonical dictionary label + UI strings. `tl()` labels, `tu()` UI. New dictionary labels MUST get translations (test enforces). |
| `chirp-forms/src/main.js` | Router: `#/` home, `#/supervisor`, `#/worker`, `#/diag`; tap-to-start gate after reload. |
| `chirp-forms/src/ui/*.js` | `components.js` (`h()` DOM helper, header/settings, toast), `supervisor.js`, `worker.js`, `diag.js` (raw link test). |
| `chirp-forms/scripts/smoke.mjs` | Headless Chrome E2E over CDP; feeds real chirp WAVs into the fake mic. |
| `chirp-forms/scripts/spike-*.cjs` | Node loopback throughput spikes. Rerun if protocol params change. |

Not yet built: `src/audio/speaker.js` (M4), PWA manifest/service worker (M5).

## Commands

```bash
cd chirp-forms
npm install                      # once
npm run dev                      # HTTPS dev server on https://<LAN-IP>:5173 (self-signed cert; accept on phone)
npm run build && npm run preview # production build check
node scripts/spike-loopback.cjs  # airtime / effective B/s per protocol (no audio hardware needed)
node scripts/spike-chunked.cjs   # browser-like 1024-sample chunked decode check
npm test                         # Vitest: 29 tests incl. lossy-air link sim + real ggwave modem loopback
npm run smoke                    # headless Chrome E2E (needs `npm run dev` running; uses installed Chrome)
```

Phones must be on the same Wi-Fi as the dev machine. Mic requires HTTPS (hence basic-ssl plugin).
Windows dev machine; shell is Git Bash. Node 24, npm 11.

## Hard facts (measured, do not re-derive)

- ggwave JS `encode`/`decode` are **binary-safe** with `Uint8Array` (embind std::string). No base64.
- Max payload per transmission: **140 bytes**. Our frames: 6 B header + <=134 B payload, <=16 chunks.
- Effective throughput incl. ECC + markers (the only number that matters), 128 B message:
  `AUDIBLE_NORMAL` 12.4 s (~10 B/s), `AUDIBLE_FAST` 8.5 s (~15 B/s), `AUDIBLE_FASTEST` 4.6 s
  (~28 B/s). ~1 s fixed cost per transmission. (Session 1 recorded 4x slower numbers — that was a
  bug: `encode()` returns F32 samples as raw bytes, divide length by 4.)
- Preset form = 19 B frame (2.6 s NORMAL); typical entry = 25 B frame (~3 s NORMAL).
- Noise robustness: NORMAL > FAST > FASTEST (longer tones). Ultrasound is weak on phone hardware.
- Decoder output is a view into a static buffer — **copy it immediately** (`Uint8Array.from`).
- Encoder output likewise — `createRadio().encode` already copies.
- A phone must not decode while it transmits (half-duplex). `createRadio` mutes Rx during Tx.
- Mic constraints: `echoCancellation:false, autoGainControl:false, noiseSuppression:false`.
- Audible band is 1875–6375 Hz: survives speakers/PA; will NOT survive narrowband phone calls.

Budgets: form broadcast <= 5 s, one entry <= 3 s. Use dictionary labels (`src/presets.js`,
APPEND ONLY) — 1 B per field; literal labels allowed up to 24 B but cost airtime.

## Conventions

- Vanilla JS ES modules, no framework, no TypeScript. 2-space indent, single quotes, semicolons.
- Small modules with one job. Protocol code (`src/protocol/*`) must be pure (no DOM, no audio) so
  it is unit-testable in Node with Vitest.
- Do not add dependencies without a reason written in PLAN.md. Current deps: `ggwave`, dev:
  `vite`, `@vitejs/plugin-basic-ssl`, (M1+) `vitest`.
- Do not add comments explaining *what*; only *why* when non-obvious.
- Build UI with `h()` from `src/ui/components.js`, never `innerHTML` with dynamic data — form
  labels and text arrive over the air from untrusted devices.
- Verification before every commit: `npm test`, `npm run build`, and `npm run smoke` for UI changes.
- Commit after each milestone or meaningful sub-step (see Part 1 cadence). Message style from now
  on: `feat:` / `fix:` / `docs:` / `test:` / `wip:` prefix + short subject; body explains why.
  Earlier commits used plain imperative subjects — do not rewrite them.
- Every meaningful commit also updates `CHANGELOG.md` (real timestamp, +05:30) and, when an AI
  agent did the work, `AI_USAGE.md` (optional per the event, but this project keeps it). Agents
  in use so far: Devin; Codex may join later.
- Push to `origin` after each commit once the remote is set up and the human has authorized it.
- UI must be thumb-friendly and readable from a projector: big buttons, dark theme, high contrast.
  Show the OFFLINE badge prominently — the constraint is the demo.
- Default protocol is `AUDIBLE_NORMAL` (most noise-robust, still ~3 s per message);
  FAST/FASTEST selectable in a settings corner for quiet rooms.

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
