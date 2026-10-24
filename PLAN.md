# Chirp Forms — Implementation Plan

> Agents: read `AGENTS.md` first (how to work, hard facts, handoff protocol, session log).
> This file is *what* to build. Tick milestone checkboxes as you go.

**Current main flow:** a coordinator broadcasts information cards (places, supplies, contacts,
instructions), receivers save and search them locally, and newer broadcasts update existing cards.
One-way information broadcasting is the current demo; existing forms remain secondary.

**Judge preparation (2026-10-25):** [FAQ.md](FAQ.md) contains 24 short answers covering the product,
technical choices, security limitations and demo evidence. Documentation consistency/links checked;
no application checks run. Next step remains phone offline reload and remaining update/replay checks.

**Verification override:** the participant asked Codex not to run checks or a demo for this change.
New tests and smoke scenarios are written but unrun; build/offline/phone verification is pending.

**Latest (2026-10-25):** participant manually confirmed broadcast reception, two distinct cards,
and updating the first after sending the second, with correct data received on the client. Light
UI polish is implemented: teal/white theme, local icons, shorter copy, collapsible optional fields
and metadata, and clearer listening/search. Runtime/visual verification remains with the participant.

**Offline reload follow-up:** participant hit Chrome's offline screen at the local 5173 development
URL. A production build has now been generated for Sites deployment at
`https://chirp-offline-relief.socialmacaw16.chatgpt.site/`, public by explicit participant choice.
Load/cache that origin once before airplane mode; old local-origin data is separate. Offline-ready
feedback now waits for actual service-worker control. Phone reload results still need confirmation.

Existing secondary flow — forms that travel by sound. Offline field data collection for disaster-relief crews:
one chirp broadcasts a form to every phone in earshot, workers fill it offline, entries
chirp back to the supervisor who merges them and exports CSV. No internet, no Bluetooth
pairing, no app install — a static PWA using the phone's speaker and mic.

Hackathon track: **Works Anyway** (constraint: no network). Demo with every phone in airplane mode.

## Hard constraints (from ggwave)

| Constraint | Consequence |
|---|---|
| ~10–28 B/s effective (see M0 measurements) | Compact binary encoding, label dictionaries, no JSON on the wire |
| 140 B max per transmission | Frame = 6 B header + <=134 B payload; larger messages are chunked (max 16) |
| ~1 s fixed overhead per transmission | Fewer, fuller chunks beat many small ones |
| Audible band 1875–6375 Hz | Survives speakers/PA; will NOT survive narrowband phone calls (don't promise it) |
| Rx must pause during Tx | Half-duplex; a phone can't hear itself |
| JS binding `encode()` takes a string | Verified binary-safe with `Uint8Array`; no base64 |

Budget targets: form broadcast <= 5 s; one entry <= 3 s. Preset form is 19 B on the wire
(2.6 s on NORMAL), a typical entry 25 B (1.5 s FASTEST / ~3 s NORMAL).

## Project structure

```
(repo root)/
  index.html              # single page, role chosen at runtime
  src/
    main.js               # routing: supervisor | worker
    audio/
      ggwave.js           # init, encode->play, mic capture->decode, tx/rx mutex
      speaker.js          # "play loud" mode + WAV export of a chirp
    protocol/
      frame.js            # header pack/unpack, CRC-8, msg types
      chunker.js          # split/reassemble, ACK bitmap, retransmit
      codec.js            # form schema <-> bytes, entries <-> bytes, label dictionary
    store.js              # localStorage: forms, entries, received chunks
    ui/
      supervisor.js       # builder, broadcast, results table, CSV
      worker.js           # receive toast, fill entries, send back
      components.js       # shared: airplane badge, chirp animation
    presets.js            # "Rapid Needs Assessment" form + label dictionary
  public/manifest.json    # PWA, offline after first load
  vite.config.js
```

Stack: Vanilla JS + Vite, `ggwave` npm (WASM), Vitest for unit tests. Zero backend.

## Wire protocol (ours, on top of ggwave)

Frame (6 B header) — implemented in `src/protocol/frame.js`:
```
magic(0xC7) | type(1) | msgId(2, BE) | chunk(1: idx<<4 | count-1) | crc8(1) | payload(<=134)
```
No length byte: ggwave delivers the exact transmitted length. CRC-8 (poly 0x07) over the frame
with the crc byte skipped. Codec byte layouts are documented at the top of `src/protocol/codec.js`.

Message types: `FORM` (schema broadcast), `ENTRIES` (worker -> supervisor), `ACK` (bitmap of
received chunks), `PING`/`PONG` (link test), `ALERT` (stretch).

Reliability: sender transmits all chunks; receiver replies `ACK` bitmap; sender retransmits only
missing chunks, up to 4 rounds total; if no ACK is heard, resend only the LAST chunk (the
receiver ACKs on last chunk, so this elicits its bitmap cheaply). Only the device that registered
`on(type, h, { ack: true })` ACKs (supervisor for ENTRIES), so bystander workers stay silent.
Implemented in `src/protocol/link.js`. `FORM` broadcasts are fire-and-forget with optional "repeat x2"
(20 receivers can't all ACK).

Codec:
- Field = `type(3 bits) | labelCode(5 bits)` + literal label only if code = 31. Dictionary of
  ~30 common relief labels -> common forms cost 1 B/field.
- Entry = values only, in field order: yes/no 1 B, choice 1 B, number varint, text
  length-prefixed UTF-8. Several entries per chunk.
- Device ID 2 B + entry seq 1 B for dedup on merge.

## Milestones

- [x] **Manual information checks (participant, 2026-10-25).** Broadcast, two distinct cards and
      an update to the first after the second were received with correct data. Device/range and
      offline/replay results were not reported; automated tests remain unrun by Codex.

- [x] **Information flow — implementation.** New primary sender and receiver routes; four card
      categories, optional coordinates/phone/hours, statuses, persistent versioned updates,
      visible update highlights, search/category filters and map/contact actions. Single coordinator.
- [x] **Offline loading — implementation.** Build-generated service worker, manifest and readiness
      notice; library browsing does not require mic access. Production preview uses port 5174.
- [ ] **Information/offline verification.** Participant will run checks and the real-phone demo.
      `npm test`, `npm run build`, `npm run smoke` (dev), then production
      `npm run smoke:offline -- https://localhost:5174`. Tests/smoke remain unrun by Codex;
      production build succeeded for hosted publication.

Information transport: new `MsgType.INFO` = 7; complete snapshots, no ACKs; reuse chunking and
broadcast repeats. Binary schema version 1 carries source ID, record ID, monotonic version,
category/status, optional millionth-degree coordinates and bounded UTF-8 title/details/phone/hours.
At most 268 payload bytes (two frames); live airtime comes from the modem. Receivers key by
source + record ID and accept only greater versions, including after reload. Missing older
versions do not block a new snapshot. Closed/withdrawn records remain searchable. Reset preserves
the sender's next-ID counter to avoid reusing IDs remembered by other phones.

No new dependencies. One coordinator, no authentication, chatbot, automatic expiry or full history.
Source text is shown as authored; existing forms translations are retained. Phone offline caching
requires trusted HTTPS; public Sites deployment of application source `f1b34a1` succeeded, while
phone offline setup/reload still awaits confirmation. Map actions still depend
on Google Maps connectivity or previously downloaded coverage.

Documentation handoff (2026-10-25): README now leads with the current card workflow; AGENTS.md
is compact, with earlier sessions preserved in docs/PROJECT_HISTORY.md. No runtime code changed.

- [x] **M0 — Spike.** Vite project, ggwave loaded, Send/Listen page. Phone-to-phone test with
      `AUDIBLE_FAST` and `AUDIBLE_FASTEST`. Record: real bytes/sec, whether raw bytes survive the
      string API, max working distance. *These numbers set every cap above.*
- [x] **M1 — Protocol core.** `frame.js`, `chunker.js`, `codec.js`, `link.js` + Vitest
      (29 tests: round-trips, corruption, truncation, simulated lossy air, real ggwave modem
      loopback). Over-air retransmit check happens naturally in M3 (cover the mic mid-send).
- [x] **M2 — Supervisor flow.** Builder (field types, preset), Broadcast with chirp animation,
      results table, CSV download. (`src/ui/supervisor.js`)
- [x] **M3 — Worker flow.** Auto-listen on open, full-screen "Form received" toast, entry form,
      saved entries, "Send to supervisor" with progress + ACK status. (`src/ui/worker.js`)
      Verified headless end-to-end (`npm run smoke`); **still needs a real two-phone run**.
- [ ] **M4 — Speaker mode.** "Via speaker" (max gain, repeat x2) + "Download chirp .wav" for
      laptop/PA/Bluetooth speaker. Test in the largest room available; record distance.
- [ ] **M5 — Demo hardening.** OFFLINE badge (`navigator.onLine`), projector-friendly dark theme,
      preset one tap away, "Demo reset", backup video recorded.
- [ ] **M6 — Stretch.** Chirp roll-call (slotted replies), `ALERT` override, vector sketch field.

## M0 measurements

Loopback in Node (`scripts/spike-loopback.cjs`, `scripts/spike-chunked.cjs`), 48 kHz, volume 10.
Effective rate = payload bytes / total airtime (includes ECC + start/end markers).

> **Correction (session 2):** the first version of these numbers was 4x too slow. `encode()`
> returns F32 samples viewed as an Int8Array of raw bytes, and the spike divided byte count by
> the sample rate. Fixed (`/ 4`). The browser `createRadio().airtime()` was always correct
> because it converts to Float32Array first.

| Protocol | 16 B | 64 B | 128 B | 140 B (max) | Effective at 128 B |
|---|---|---|---|---|---|
| AUDIBLE_NORMAL | 2.4 s | 6.6 s | 12.4 s | 13.6 s | 10.3 B/s |
| AUDIBLE_FAST | 1.8 s | 4.7 s | 8.5 s | 9.3 s | 15.1 B/s |
| AUDIBLE_FASTEST | 1.3 s | 2.7 s | 4.6 s | 5.0 s | 27.9 B/s |
| DT_FASTEST | 2.3 s | 6.5 s | 12.3 s | 13.4 s | 10.4 B/s |

Findings:
- Raw binary (0x00..0xFF) passes through `encode`/`decode` untouched — embind accepts
  `Uint8Array` for `std::string`. **No base64 needed.**
- Feeding the decoder in 1024-sample chunks (browser mic pattern) decodes correctly.
- Reusing one instance for encode then decode has produced a corrupt 128 B NORMAL decode in the
  spike (reproducible at that position in the run; fresh instances always pass). Our CRC-8 rejects
  such frames and the link retransmits, so this is handled, but never trust unframed output.
- ~1 s fixed overhead per transmission, so one fuller chunk still beats two small ones.

Budgets: preset 6-field form = 13 B payload / 19 B frame -> 1.3 s FASTEST, 2.6 s NORMAL.
Typical entry = 25 B frame -> 1.5 s FASTEST, ~3 s NORMAL. Because messages are this small,
**AUDIBLE_NORMAL (most noise-robust) is affordable as the demo default.**

Phone-to-phone over air: **confirmed working** (2026-10-24, user's two Android phones, link-test
page, byte-exact RX OK). Per-distance / noisy-room numbers still to be filled in:

| Protocol | Success 5/5 at 0.5 m | at 2 m | at 5 m (speaker) | Notes |
|---|---|---|---|---|
| AUDIBLE_NORMAL | | | | |
| AUDIBLE_FAST | | | | |
| AUDIBLE_FASTEST | | | | |
| (any) with loud crowd noise from a laptop at 1 m | | | | |

Phones: main phone = ______ , spare phone = ______

## Testing

- Unit: codec/chunker round-trips, CRC, ACK bitmap math.
- Loopback: encode -> decode in-memory with injected noise / dropped chunks (no mic).
- Field: per-phone checklist — distance, noise level, success rate over 5 tries.

## Risks

| Risk | Mitigation |
|---|---|
| Venue noise kills decode | AUDIBLE_FAST for demo; phones <= 1 m; speaker for range; repeat x2 |
| A phone's mic is bad | Test every demo phone early; best two = supervisor + hero worker |
| Chrome blocks mic/audio without gesture | Everything starts from a tap; one Start button per role |
| Self-hearing / echo | Pause Rx during Tx; disable echoCancellation / noiseSuppression / autoGainControl |
| Many workers chirp at once | v1: one at a time; roll-call slotting is M6 |
| Demo-day Wi-Fi needed to load page | PWA installed beforehand; laptop hotspot fallback |

## Demo script (3 min)

1. Phones face up, airplane mode visibly on. (15 s)
2. Build 4-field form live: House no / People / Water? / Injuries. (30 s)
3. Broadcast. All phones show "Form received". (20 s)
4. Judge fills an entry, chirps it back, row appears in table. (30 s)
5. Play broadcast chirp through a speaker across the room; distant phone receives. (20 s)
6. "Why not QR": one-to-many, no aiming, rides on any audio channel. CSV export. (30 s)
7. Close on the user: relief crews. (15 s)

## Day-before checklist

Phones charged, PWA installed, airplane-mode toggle rehearsed, speaker paired/wired before
airplane mode, preset loaded, backup video on laptop, "why not QR" slide ready.
