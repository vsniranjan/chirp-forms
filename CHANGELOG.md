# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

Entries before the template adoption were written retroactively from the git history. Their timestamps are the real commit times.

## 2026-10-25T02:36:59+05:30 — Prepare hosted offline demo and reliable readiness

- Changed: Sites production-hosting manifest, development link to the hosted copy, and offline
  readiness that waits for the service worker to control the page. Updated setup and handoff docs.
- Why: participant reported Chrome's offline screen after reloading the laptop development URL
  on port 5173. That server does not precache the app, and its certificate is unsuitable for a
  straightforward phone offline setup. Publish the production build at a normal HTTPS address.
- Validation: production build completed successfully. Deployment is handled through native Sites
  tools; success must be confirmed by their returned deployment state. No test suites or phone
  demo were run, preserving the participant's preference. Existing ggwave fs/path browser-external
  warnings remain build warnings; the build completed.
- Limitations: phones still need to load/cache the new address online once. Old LAN-address cards
  remain in that origin's storage. Public access was explicitly selected by the participant.

## 2026-10-25T02:25:13+05:30 — Record participant's information-flow checks

- Changed: README, PLAN, AGENTS, SUBMISSION and AI_USAGE status records.
- Why: record the participant's actual manual results: successful broadcast reception, two distinct
  cards, and updating the first card after sending the second, with correct data received by the client.
- Validation: these cases were reported passing by the participant. No agent-run tests, builds or demos.
- Limitations: device/range, offline reload, closure/replay cases, signature verification and
  automated test outcomes were not established by this report. No code changed.

## 2026-10-24T23:46:07+05:30 — Light theme and simpler information screens

- Changed: replaced the dark UI with warm white panels, teal accents, readable status colours,
  rounded controls and responsive spacing. Added local SVG icons and a compact Chirp app bar;
  simplified home cards, sender/editor and receiver listening/search views. Optional fields and
  record metadata now expand on demand; saving closes the editor; airtime uses a short seconds
  label. Updated app icon/theme metadata, offline status copy and matching smoke selector.
- Why: participant confirmed the information flow works and requested lighter colours, icons,
  less text and a more approachable UI. No protocol/storage changes or dependencies added.
- Validation: participant confirmation applies to the previous information flow; details of which
  scenarios/devices were checked were not provided. No build, tests, browser preview or demo run
  for this UI change, continuing the participant's instruction to leave checks to them.
- Limitations: visual layout and new collapsed-editor interactions remain unverified at runtime.
  Existing offline-map, foreground-listening and initial-cache requirements still apply.

## 2026-10-24T22:57:25+05:30 — Saved disaster information and versioned sound updates

- Changed: new primary information sender/library UI; four categories, coordinates/phone/hours,
  statuses, persistent cards, search/filter and visible in-place updates. Added binary `INFO` snapshots
  and newer-revision-only merging; existing forms remain secondary. Added production offline cache,
  manifest/readiness notice, separate preview port 5174, unit and browser smoke scenarios; updated
  README/PLAN/AGENTS/SUBMISSION and AI usage. No new dependencies.
- Why: public announcements should leave exact, searchable information on phones; subsequent
  broadcasts should update those records without duplicates or older replays reopening closed sites.
- Validation: **tests, build, browser smoke and real-phone demo not run** because the participant
  explicitly requested to check later. Earlier passing results do not verify this change.
- Limitations: one coordinator, unsigned broadcasts, English new UI/authored text retained as sent;
  reception requires foreground listening. Offline cache requires initial load from trusted HTTPS;
  phone cache, maps handoff, audio range and complete flow remain unverified. External maps/calls
  have their own connectivity requirements. WAV export remains deferred.

## 2026-10-24T22:30:00+05:30 — Flatten repo: app moved to the root

- Changed: Moved everything in `chirp-forms/` (`src/`, `scripts/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`) to the repository root with `git mv`. Updated paths and commands in `README.md`, `AGENTS.md`, `PLAN.md` and `SUBMISSION.md`. Older changelog entries keep their original `chirp-forms/` paths as history.
- Why: Standard single-folder project layout. `npm` commands now run from the repo root.
- Validation: `npm test` 32/32. `npm run build` OK. `npm run smoke` 25/25, run twice.
- Limitations: None identified.

## 2026-10-24T22:20:00+05:30 — Correct event to Devin Hack Kochi

- Changed: Applied the organizer's template correction (the template shared earlier was for an older event). `RULES.md` and the PR template were updated with the organizer's patch; `README.md`, `AGENTS.md`, `SUBMISSION.md` and `AI_USAGE.md` were edited to match.
- Why: The old template named DevDay Exchange and required Codex. Devin Hack Kochi has no major AI usage constraints.
- Validation: Docs-only. The organizer's patch applied cleanly to the unchanged files.
- Limitations: None identified.

## 2026-10-24T22:15:00+05:30 — Each worker sees the form in their own language

- Changed: New `src/i18n.js` with English, Malayalam and Hindi for every dictionary label and every worker UI string. `src/ui/worker.js` has a language picker and translated labels, options, yes/no and status text. The supervisor builder hint explains the behaviour. Tests are in `src/i18n.test.js`, and `scripts/smoke.mjs` has new checks.
- Why: Answers the question "why not just announce it on a loudspeaker?". Labels travel as 1-byte codes, so each phone renders them in its own language at zero extra airtime, while answers are stored and sent back as canonical English, so the supervisor's CSV stays uniform.
- Validation: `npm test` 32/32. `npm run build` OK. `npm run smoke` 25/25, including: a worker switched to Malayalam sees Malayalam labels, saves an entry by tapping a Malayalam option, and the stored value is the English `Medical`. The preset form is still 13 bytes.
- Limitations: Translations were written by the AI agent and need native-speaker review. Custom (non-dictionary) labels and free-text answers are not translated. The supervisor screen is English only.
- Also: Discarded uncommitted sketch/photo prototype code. The participant chose to focus on demo-critical features.

## 2026-10-24T22:10:00+05:30 — Connect GitHub repository

- Changed: Added `origin` (github.com/vsniranjan/chirp-forms, created from the event template) and merged its initial commit, keeping the filled-in versions of the template files. Team (solo, @vsniranjan) and repo URL are now in `README.md` and `SUBMISSION.md`.
- Why: Organizers track progress through the GitHub repository.
- Validation: SSH auth to GitHub OK. `RULES.md` and the PR template are identical to the template. `npm test` was run before push (see the push commit).
- Limitations: Final submission SHA is still TODO.

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
