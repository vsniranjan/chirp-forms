# AI usage record

If maintaining this record, briefly document the actual contributions of whichever AI tools you use at Devin Hack Kochi. Add a row after each meaningful task or milestone. Keep summaries concise and omit secrets, private data, and full chat transcripts.

## Event build log

The earlier build used **Devin** (Cognition's coding agent, running Claude Opus). **Codex** joined
for product planning and the saved-information flow. "Human review" says what the participant actually checked.

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24T22:57:25+05:30 | Codex (GPT-6) | One-way information cards and local reference library | Product discussion/plan; `src/protocol/info.js`, `src/ui/information.js`, routing/storage/styles, production offline cache and manifest, unit/smoke scenarios, project docs. Reused ggwave and existing link/chunking; no dependencies added. | Participant approved plan, chose one coordinator/search/categories/retained closed cards, then explicitly requested no demo or check runs. Code and phone review pending. | Tests, build, browser smoke and phone demo **not run**, as requested. Existing forms test scenarios retained; new replay/update/offline scenarios written. |
| 2026-10-24T20:00+05:30 (approx., before first commit) | Devin (Claude Opus) | Ideation against the track list; checked for prior art | Proposed ideas, ran web searches for existing products, stress-tested "forms over sound" against likely judge questions. No files. | Participant chose the idea, target user (relief crews), Android-only demo and stack. | n/a |
| 2026-10-24T20:55:25+05:30 | Devin (Claude Opus) | M0 scaffold and modem spike | `PLAN.md`, `chirp-forms/` Vite scaffold, `src/audio/ggwave.js`, link-test page, `scripts/spike-*.cjs` | Participant ran the link test on two Android phones and confirmed byte-exact delivery. | Node loopback OK. Airtime numbers were wrong by 4x; the agent found and corrected this later. |
| 2026-10-24T20:57:41+05:30 | Devin (Claude Opus) | Agent handoff memory | `AGENTS.md` | Requested by participant; content review pending. | Docs-only |
| 2026-10-24T21:27:12+05:30 | Devin (Claude Opus) | M1 protocol: frame, codec, chunker, reliable link | `src/protocol/*.js` and tests, `src/presets.js` | Code review pending. | Vitest 29/29 passing, including real ggwave loopback. |
| 2026-10-24T21:33:39+05:30 | Devin (Claude Opus) | M2/M3 supervisor and worker UI, smoke test | `src/ui/*.js`, `src/store.js`, `src/main.js`, `src/style.css`, `scripts/smoke.mjs` | Code review and real two-phone run pending. | Build OK; `npm run smoke` 20/20 in headless Chrome. |
| 2026-10-24T22:15+05:30 | Devin (Claude Opus) | Per-phone language (English / Malayalam / Hindi) | `src/i18n.js`, `src/i18n.test.js`, `src/ui/worker.js`, `src/ui/supervisor.js`, `src/style.css`, `scripts/smoke.mjs`. Translations written by the agent. | Participant chose the feature. **Malayalam/Hindi wording not yet reviewed by a native speaker.** Agent also discarded its own uncommitted image prototype at the participant's request. | Vitest 32/32; smoke 25/25 incl. Malayalam entry stored as English. |
| 2026-10-24T21:59+05:30 | Devin (Claude Opus) | Adopt event repository template | `README.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `AGENTS.md`, `RULES.md`, `.github/`, `.gitignore` | Requested by participant; review pending. | Docs-only; links checked. |

## Template preparation

On 10 October 2026, Codex prepared this documentation template from the organizer's supplied rules and checked the linked Luma page for the event name and dates. This covered `README.md`, `RULES.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `.gitignore`, and the pull request checklist. Agent validation covered local links, event consistency, required documents, and diff whitespace; organizer review is pending.

This preparation is separate from participant project implementation and participant AI usage during the event.
