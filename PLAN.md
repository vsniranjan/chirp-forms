# Chirp Forms — Implementation Plan

Forms that travel by sound. Offline field data collection for disaster-relief crews:
one chirp broadcasts a form to every phone in earshot, workers fill it offline, entries
chirp back to the supervisor who merges them and exports CSV. No internet, no Bluetooth
pairing, no app install — a static PWA using the phone's speaker and mic.

Hackathon track: **Works Anyway** (constraint: no network). Demo with every phone in airplane mode.

## Hard constraints (from ggwave)

| Constraint | Consequence |
|---|---|
| 8–16 bytes/sec | Compact binary encoding, label dictionaries, no JSON on the wire |
| 140 B max per transmission | Frame = 8 B header + <=128 B payload; larger messages are chunked |
| ~0.5–1 s marker overhead per transmission | Fewer, fuller chunks beat many small ones |
| Audible band 1875–6375 Hz | Survives speakers/PA; will NOT survive narrowband phone calls (don't promise it) |
| Rx must pause during Tx | Half-duplex; a phone can't hear itself |
| JS binding `encode()` takes a string | M0 must check whether raw bytes survive; fallback base64 (+33%) |

Budget targets: form broadcast <= 10 s (<= ~128 B, one chunk). One filled entry <= 4 s (<= ~40 B).
Demo returns 1–2 entries, not 10.

## Project structure

```
chirp-forms/
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

Frame (8 B header):
```
magic(1) | type(1) | msgId(2) | chunkIdx(1) | chunkCount(1) | len(1) | crc8(1) | payload(<=128)
```

Message types: `FORM` (schema broadcast), `ENTRIES` (worker -> supervisor), `ACK` (bitmap of
received chunks), `PING`/`PONG` (link test), `ALERT` (stretch).

Reliability: sender transmits all chunks; receiver replies `ACK` bitmap; sender retransmits only
missing chunks, up to 3 rounds. `FORM` broadcasts are fire-and-forget with optional "repeat x2"
(20 receivers can't all ACK).

Codec:
- Field = `type(3 bits) | labelCode(5 bits)` + literal label only if code = 31. Dictionary of
  ~30 common relief labels -> common forms cost 1 B/field.
- Entry = values only, in field order: yes/no 1 B, choice 1 B, number varint, text
  length-prefixed UTF-8. Several entries per chunk.
- Device ID 2 B + entry seq 1 B for dedup on merge.

## Milestones

- [ ] **M0 — Spike.** Vite project, ggwave loaded, Send/Listen page. Phone-to-phone test with
      `AUDIBLE_FAST` and `AUDIBLE_FASTEST`. Record: real bytes/sec, whether raw bytes survive the
      string API, max working distance. *These numbers set every cap above.*
- [ ] **M1 — Protocol core.** `frame.js`, `chunker.js`, `codec.js` + Vitest round-trip tests.
      Over audio: send 300 B, cover mic for one chunk, watch ACK + retransmit recover it.
- [ ] **M2 — Supervisor flow.** Builder (field types, preset), Broadcast with chirp animation,
      results table, CSV download.
- [ ] **M3 — Worker flow.** Auto-listen on open, full-screen "Form received" toast, entry form,
      saved entries, "Send to supervisor" with progress + ACK status.
- [ ] **M4 — Speaker mode.** "Via speaker" (max gain, repeat x2) + "Download chirp .wav" for
      laptop/PA/Bluetooth speaker. Test in the largest room available; record distance.
- [ ] **M5 — Demo hardening.** OFFLINE badge (`navigator.onLine`), projector-friendly dark theme,
      preset one tap away, "Demo reset", backup video recorded.
- [ ] **M6 — Stretch.** Chirp roll-call (slotted replies), `ALERT` override, vector sketch field.

## M0 measurements

Loopback in Node (`scripts/spike-loopback.cjs`, `scripts/spike-chunked.cjs`), 48 kHz, volume 10.
Effective rate = payload bytes / total airtime (includes ECC + start/end markers). This is the
number that matters, and it is roughly HALF the "8-16 B/s" headline.

| Protocol | 16 B | 64 B | 128 B | 140 B (max) | Effective at 128 B |
|---|---|---|---|---|---|
| AUDIBLE_NORMAL | 9.6 s | 26.5 s | 49.6 s | 54.2 s | 2.6 B/s |
| AUDIBLE_FAST | 7.3 s | 18.6 s | 34.0 s | 37.0 s | 3.8 B/s |
| AUDIBLE_FASTEST | 5.0 s | 10.7 s | 18.4 s | 19.9 s | 7.0 B/s |
| DT_FASTEST | 9.1 s | 26.0 s | 49.1 s | 53.7 s | 2.6 B/s |

Findings:
- Raw binary (0x00..0xFF) passes through `encode`/`decode` untouched — embind accepts
  `Uint8Array` for `std::string`. **No base64 needed.**
- Feeding the decoder in 1024-sample chunks (browser mic pattern) decodes correctly.
- Reusing one instance across many messages/protocols left stale state once -> use one instance
  per role and treat any decode mismatch as "retry", never trust partial output.
- Fixed ~4 s overhead per transmission (markers + ECC floor), so **one fuller chunk beats two
  small ones**.

Revised budgets (AUDIBLE_FASTEST is the demo default; FAST is the noisy-room fallback):
- Form broadcast target <= 10 s  ->  <= ~55 B total  ->  dictionary labels mandatory (1 B/field),
  literal labels <= 6 chars each. 5-field preset form ~ 15 B -> ~5 s.
- One entry chirp-back target <= 6 s  ->  <= ~25 B  ->  8 B header + 3 B ids + ~12 B values. OK.
- Max useful chunk = 128 B payload = 18 s on FASTEST. Anything >1 chunk is a "long send" in the UI.

Phone-to-phone over air (fill in on device):

| Protocol | Success 5/5 at 0.5 m | at 2 m | at 5 m (speaker) | Notes |
|---|---|---|---|---|
| AUDIBLE_FAST | | | | |
| AUDIBLE_FASTEST | | | | |

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
