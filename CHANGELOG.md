# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

Entries before the template adoption were written retroactively from the git history. Their timestamps are the real commit times.

## 2026-10-24T21:59:00+05:30 — Adopt hackathon repository template

- Changed: Added the template's `RULES.md`, `.github/pull_request_template.md`, `README.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md` and `.gitignore` rules. Merged the template agent guide into `AGENTS.md` as Part 1, with the project memory as Part 2.
- Why: The organizers require repositories created from the event template.
- Validation: Docs-only change. Checked that local links resolve and that README commands match `chirp-forms/package.json`.
- Limitations: Team names, GitHub handles, repository URL and final SHA are still TODO.

## 2026-10-24T21:34:06+05:30 — Update plan and handoff log after M1–M3

- Changed: `PLAN.md` milestone checkboxes; `AGENTS.md` file map, commands and session log.
- Why: Lets any agent or teammate resume work without chat history.
- Validation: Docs-only.
- Limitations: None identified.

## 2026-10-24T21:33:39+05:30 — Supervisor and worker screens, end-to-end smoke test (M2/M3)

- Changed: `src/ui/supervisor.js` (form builder, broadcast, results table, CSV), `src/ui/worker.js` (receive, fill, save, reliable send), `src/ui/components.js`, `src/store.js`, router in `src/main.js`, link test moved to `src/ui/diag.js`, `scripts/smoke.mjs`.
- Why: Complete the core product loop from compose to CSV.
- Validation: `npm test` passed 29/29. `npm run build` succeeded. `npm run smoke` passed 20/20 checks in headless Chrome, with real ggwave chirps fed into the fake mic in both directions (worker received the form; supervisor received an entry and sent an ACK).
- Limitations: The full flow is not yet run on two real phones. DOM is built without `innerHTML` because labels arrive from untrusted devices.

## 2026-10-24T21:27:12+05:30 — Reliable link layer; fix 4x airtime measurement error

- Changed: `src/protocol/link.js` (broadcast, ACK bitmap, selective retransmit; only the `ack:true` subscriber replies). Tests in `link.test.js` and `modem.test.js`. Fixed `scripts/spike-loopback.cjs`.
- Why: Entries must arrive reliably over a lossy channel. The spike had counted F32 sample bytes as samples, so the recorded airtimes were 4x too long.
- Validation: Vitest passed for lost-chunk, lost-ACK, no-receiver and noise cases, plus real ggwave encode→decode of our frames. Re-measured airtimes are recorded in `PLAN.md`.
- Limitations: Over-air retransmit has not yet been observed on real phones.

## 2026-10-24T21:23:58+05:30 — Wire frame, compact codec, chunker (M1)

- Changed: `src/protocol/frame.js` (6-byte header, CRC-8), `codec.js` (form and entries ⇄ bytes with a shared label dictionary), `chunker.js`, `src/presets.js`, plus tests.
- Why: Sound carries roughly 10–28 bytes/s, so every byte is airtime. The preset 6-field form encodes to 13 bytes.
- Validation: Vitest round-trip, corruption and truncation tests passed.
- Limitations: Label dictionary is append-only for compatibility.

## 2026-10-24T21:21:27+05:30 — M0 confirmed on phones; add Vitest

- Changed: `PLAN.md`, `chirp-forms/package.json`.
- Why: The main technical risk (phone-to-phone audio decoding) was retired.
- Validation: Manual test by the participant on two Android phones with the link-test page; received payloads were byte-exact.
- Limitations: Distance and noise measurements are not yet recorded.

## 2026-10-24T20:57:41+05:30 — Agent memory and handoff protocol

- Changed: `AGENTS.md`.
- Why: Work may move between AI agents (Devin, Codex) when usage limits are reached.
- Validation: Docs-only.
- Limitations: None identified.

## 2026-10-24T20:55:25+05:30 — Project scaffold and ggwave link-test spike (M0)

- Changed: `PLAN.md`, Vite project `chirp-forms/`, `src/audio/ggwave.js`, link-test page, Node loopback spikes.
- Why: Prove data-over-sound works in the browser before building the product.
- Validation: Node loopback confirmed binary-safe encode/decode. Dev server served the page over HTTPS.
- Limitations: Throughput numbers in this commit were later found to be 4x too pessimistic (fixed in 3c0b15f).

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
