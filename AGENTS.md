# AGENTS.md — Chirp

Practical context for reviewing or contributing to this repository. Read [README.md](README.md)
for the product, demo and setup; [RULES.md](RULES.md) for event guidance. Use the code and actual
check results as evidence. The roadmap describes intended work, not completed features.

## Current product

Chirp broadcasts small disaster-information cards over sound. The main routes are `#/broadcast`
and `#/saved`. Receivers save places, supplies, contacts and instructions locally, then apply
newer broadcasts to the same records. The older forms/entries/CSV workflow remains secondary
under **Forms and diagnostics**; it has not been removed.

- Public demo: https://chirp-offline-relief.socialmacaw16.chatgpt.site/
- Stack: vanilla JavaScript ES modules, Vite, ggwave/WASM, Web Audio, localStorage; no application backend.
- The website needs initial online loading. Production caching supports later offline use;
  the `:5173` development server itself is not the offline demo.
- ggwave supplies the modem. Chirp supplies framing/chunking, compact records, versioned updates,
  persistence, search and the UI. AI assistance is documented in [AI_USAGE.md](AI_USAGE.md).

## Status to preserve accurately

The participant manually confirmed broadcast reception, two distinct cards, and updating the
first after the second, with correct client data (2026-10-25). The production build passed and
Sites published application source `f1b34a1`. Phone offline reload, adversarial/replay cases and
measured range/noise results are not recorded as passed. Expanded unit/smoke scenarios exist but
were not run by Codex; older 32-test/25-smoke counts belong to the forms baseline.

Broadcasts are **unsigned and public**. Source IDs, CRCs and revision numbers do not authenticate
senders. Signatures/trust setup and private messaging were discussed but are not implemented.
Information cards are not automatically translated; the language feature belongs to worker forms.
A missed update leaves the last received record; there is no guaranteed delivery or automatic expiry.

## Where changes belong

- `src/ui/information.js`: sender editor, receiver library and listening UI.
- `src/protocol/info.js`: complete-record codec, validation, newer-only merge and search.
- `src/protocol/{frame,chunker,link}.js`: shared framing and transport; forms use the reliable return path.
- `src/audio/ggwave.js`: half-duplex sound wrapper. `src/store.js`: browser persistence.
- `src/offline.js` and `scripts/offline-plugin.js`: readiness and production precaching.
- `src/main.js`: routes. `src/ui/components.js`: DOM helper/shared UI. Local SVG icons live in `src/ui/icons.js`.

## Implementation rules

- Inspect `git status` and recent history before editing; preserve unrelated work. Follow the
  existing simple modules, two-space indentation, single quotes and semicolons. Avoid new
  dependencies or frameworks without a concrete reason recorded in PLAN.md.
- Build UI with `h()`; never interpolate received text into `innerHTML`. Treat sound payloads as
  untrusted input. Keep protocol helpers independent of DOM/audio.
- Record identity is `(sourceId, id)`. Only greater record versions replace saved data; repeats
  and older versions must remain harmless across reloads. Broadcast full snapshots, not patches.
  Persist successfully before reporting a card saved. Keep the sender ID counter across resets.
- `INFO` is message type 7, capped at 268 payload bytes/two frames. Shared frames are at most
  140 bytes: a six-byte header plus up to 134 payload bytes, with at most 16 chunks per message.
- Information broadcasts do not receive ACKs. Only forms' reliable return path uses receipts/retries.
  Never present completed playback as proof that every listener received the message.
- Preserve half-duplex audio, immediate copies of ggwave's reused buffers, and mic constraints
  disabling echo cancellation, automatic gain and noise suppression. Encoder output is raw F32
  bytes; do not reintroduce the historical four-times airtime error. See PLAN.md for measurements.
- Keep the forms label dictionary append-only and maintain its translation coverage. Current UI
  direction: light warm-white/teal, local icons, concise text, accessible touch controls.

## Checks and checkpoints

Use the actual commands in `package.json`: `npm test`, `npm run build`, `npm run smoke`, and
`npm run smoke:offline -- https://localhost:5174`. Smoke needs Chrome and the matching server
running separately (`npm run dev` on 5173, production preview on 5174). There is no lint script.

Run checks appropriate to the task unless the user directs otherwise. The current participant
asked the coding assistant to leave test/demo runs to them; production builds were later needed
for publishing. Report exactly what ran. This historical preference does not replace a reviewer's
own validation instructions. For documentation-only work, check links and factual consistency.

Update CHANGELOG.md with a real timestamp/timezone and AI_USAGE.md for meaningful AI work;
keep README/PLAN current when behaviour changes. Review and explicitly stage task files, then
commit coherent milestones using `feat:`, `fix:`, `docs:` or `test:` messages. Aim for checkpoints
about every 30 minutes when meaningful work is ready. Push to the authorised `origin`; never
force-push, backdate, rewrite shared history, or commit secrets/private participant data.

Hosting uses `.openai/hosting.json`. Preserve its Sites project ID and public audience. Follow the
Sites publishing workflow for application changes; keep the deployed source SHA distinct from
newer documentation commits. The hosted and laptop-IP origins have separate browser storage.

Before handing off, record completed work, remaining work, check results and the exact next step
in PLAN.md or a short history entry. Keep unsupported claims out of SUBMISSION.md; final submission
SHA is still unset. Follow the current Devin Hack Kochi organisers' instructions; there are no
major AI-provider restrictions. Libraries/APIs are allowed with attribution.

Current priorities: confirm hosted offline reload, verify closure/replay behaviour, then implement
coordinator signatures if requested. Android packaging, private messages and WAV export are deferred.
Earlier decisions and session notes are preserved in [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md).
