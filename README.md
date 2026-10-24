# Chirp — useful information, saved and updated by sound

Broadcast useful disaster information to nearby phones with **no network**. A coordinator creates
cards for places, supplies, contacts and instructions. Listening phones save the cards locally;
later broadcasts update the same cards. People can search the information afterward instead of
remembering an announcement or copying down coordinates. Existing two-way forms remain available
under **Forms and diagnostics**.

**Current status:** on 2026-10-25, the participant manually confirmed broadcast reception, two
different cards received correctly, and updating the first card after sending the second, with
the correct data received on the client. Device models, range, offline reload and comprehensive
visual review were not specified. Codex continues to leave test/build/demo runs to the participant.

The interface now uses a light teal theme, local line icons and shorter copy. **New card** opens
the editor; optional location/hours/phone fields expand when needed. Saving closes the editor so
the card's **Broadcast** action is easy to reach. Receiver cards keep raw coordinates and source
metadata under **More details**; search, status and useful actions stay visible. No external fonts,
icon downloads or new dependencies are required.

Built for the hackathon track **"Works Anyway"** (constraint: no connectivity). Target users:
**disaster-relief crews** doing rapid needs assessments after floods or earthquakes.

**[Event rules](RULES.md)** · **[Agent instructions](AGENTS.md)** · **[Implementation plan](PLAN.md)** · **[Change log](CHANGELOG.md)** · **[AI usage](AI_USAGE.md)**

## Event

**Devin Hack Kochi** — track: *Works Anyway*. The event has no major AI usage constraints; see [RULES.md](RULES.md).

## Project overview

- **Project name:** Chirp Forms
- **Short description:** Broadcasts structured disaster-information cards over sound. Phones keep a
  searchable offline reference, and newer broadcasts update saved details without duplicates or
  older messages undoing a closure. Reception range still needs measurement.
- **Team:** Solo — Niranjan ([@vsniranjan](https://github.com/vsniranjan)).
- **Repository:** https://github.com/vsniranjan/chirp-forms
- **Working demo:** local demo, see [Run the project](#run-the-project) and [Demo walkthrough](#demo-walkthrough).
- **Technology stack:** Vanilla JavaScript (ES modules), Vite, [ggwave](https://github.com/ggerganov/ggwave)
  (WASM data-over-sound modem), Web Audio API, localStorage. No backend. Tests with Vitest.

### Run the project

1. **Prerequisites and versions:** Node.js 24 (tested with 24.16; Vite 8 needs >= 20.19), npm 11.
   Android phones with Chrome on the same Wi-Fi as the dev machine. Google Chrome on the dev machine
   for the smoke test only.
2. **Dependency installation:**
   ```bash
   npm install
   ```
3. **Environment setup:** none. No API keys or environment variables are used.
4. **Start the project:**
   ```bash
   npm run dev
   ```
   Open the printed `https://<LAN-IP>:5173` URL on each phone. The dev server uses a self-signed
   certificate (the mic requires HTTPS), so tap *Advanced → Proceed* once per phone.
5. **Run checks or tests:**
   ```bash
   npm test          # protocol, information-record and translation tests
   npm run build     # production build
   npm run smoke     # headless Chrome end-to-end (needs `npm run dev` running in another terminal)
   ```

### Information walkthrough

1. Sender: choose **Broadcast information**, tap **Use water example**, edit the details and
   coordinates, then **Save card**. The example coordinates are illustrative, not a verified aid site.
2. Receiver: choose **Saved information** and tap **Start listening**. Leave this screen open.
3. Sender: tap **Broadcast** on the saved card. It shows byte count and estimated airtime.
   The receiver saves and displays the card, including **Open in Maps** when coordinates are present.
4. Sender: tap **Edit**, change the hours, **Save changes**, then **Broadcast** again.
   The receiver updates the existing card and highlights it with **Updated just now**.
5. Repeat with status **Closed** or **Withdrawn**. Replaying an older version cannot reopen the card.
6. Receiver: stop listening, search **water**, or filter by category. Saved information remains
   readable without microphone permission. Card text stays in the language the coordinator entered.

Changes save locally when **Save changes** is tapped; they reach receivers only after **Broadcast**.
Each broadcast is one complete card, at most two chirps, with optional repeats in Settings. There
are no receiver acknowledgements and the sender does not claim delivery to every phone.

### Offline loading

```bash
npm run build
npm run preview       # production preview on port 5174; development stays on 5173
npm run smoke:offline -- https://localhost:5174
```

The production build generates a service worker that saves the app, styles and modem assets.
Wait for **Available offline** before disconnecting. Development
mode does not cache the app or display a setup footer. Production and development use different ports to avoid stale cached
development pages. Close all Chirp tabs and reopen when the app reports an update is saved.

On phones, offline installation requires a trusted HTTPS site; simply proceeding past the dev
server's certificate warning may not allow a service worker. A static HTTPS host can serve `dist/`
without any backend. Relative asset paths support hosting under a subdirectory. No hosting or
phone-cache installation has been performed as part of this change.

Map buttons open Google Maps with the transmitted coordinates. Offline map use requires coverage
downloaded beforehand; Google Maps offline walking directions are unavailable. Calls require phone
service. Both actions are optional: the coordinates, hours, number and instructions remain in Chirp.
See [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) and
[offline maps](https://support.google.com/maps/answer/6291838).

### Existing forms walkthrough

Open **Forms and diagnostics** on the home screen first.

1. Phone A: open the app and tap **Supervisor**. The *Rapid Needs* preset form is loaded (13 bytes,
   about 2.6 s of sound). Tap **Broadcast form**.
2. Phone B: open the app and tap **Field worker**, then pick **മലയാളം**. It shows **ഫോം ലഭിച്ചു ✓**
   (Form received) when it hears the chirp, with every label in Malayalam.
3. Phone B: fill an entry, tap **Save entry**, then hold it near phone A and tap **Send**.
4. Phone A: the entry appears in the results table **in English** and A chirps back a receipt.
   Phone B shows **എത്തി** (Delivered).
5. Tap **Download CSV** on phone A.
6. Repeat with airplane mode on, once the page is already loaded.

### Current status

- **Information implementation; automated checks pending at the participant's request:** information sender/editor,
  four categories, persistent receiver library, in-place versioned updates, search and filtering,
  map/contact actions, byte/airtime display, and production offline caching. New unit and smoke
  scenarios are provided but have not been executed. No new dependencies were added.
- **Participant-confirmed manual checks (2026-10-25):** broadcast reception, two distinct cards,
  and a correct update to the first card after the second was sent. This does not establish
  automated test results, offline reload, replay protection, noisy-room range or signed verification.
- Cards use one coordinator for the demo. A source ID identifies records; it is not authentication.
  There is no automatic translation of authored information, expiry, chatbot or full history.

- **Working features (verified by `npm test` and `npm run smoke`):**
  - Form builder that shows the live byte count and airtime.
  - One-to-many form broadcast.
  - Worker side: receives the form, stores entries offline, and sends them back reliably (receipt
    with resend of any missing parts).
  - Supervisor side: merges entries with duplicates removed, and exports CSV.
  - **Per-phone language.** Each worker picks English, Malayalam or Hindi and sees the form in that
    language. Answers come back to the supervisor in English. This costs no extra airtime because
    labels travel as 1-byte codes.
  - Selectable sound modes and a raw link-test screen.
- **Verified on real phones:** raw phone-to-phone chirp transfer on two Android phones (link-test
  screen). The full supervisor ↔ worker flow has so far only been verified headlessly (real chirp
  audio fed into Chrome's fake microphone). A real two-phone run is pending.
- **Known limitations:**
  - Bandwidth is about 10–28 bytes/s depending on sound mode, so it carries text and numbers only, not photos.
  - Malayalam and Hindi translations are AI-written and pending native-speaker review. Custom labels
    and free-text answers are not translated.
  - Half-duplex, so one worker sends at a time.
  - Untested on iOS Safari.
  - First loading/caching needs connectivity. Production offline caching is implemented but untested.
  - The audible band will not survive narrowband phone calls.
- **Deferred:** loudspeaker mode/WAV export and additional demo polish. See [PLAN.md](PLAN.md).
- **Libraries, APIs, and public datasets used:**
  - [ggwave](https://github.com/ggerganov/ggwave) by Georgi Gerganov, MIT licence. It is the FSK modem
    with Reed-Solomon error correction. Our code is the framing, chunking, ACK/retransmit protocol, the
    compact form codec, and the app.
  - [Vite](https://vite.dev) and [@vitejs/plugin-basic-ssl](https://github.com/vitejs/vite-plugin-basic-ssl), MIT.
  - [Vitest](https://vitest.dev), MIT.
  - No public datasets.

### Repository layout

| Path | Contents |
| --- | --- |
| `src/audio/` | Web Audio + ggwave send/listen wrapper |
| `src/protocol/` | Frame format, codec, chunker, reliable link (pure, unit-tested) |
| `src/ui/` | Supervisor, worker and link-test screens |
| `scripts/` | Smoke test and throughput spikes |
| `PLAN.md` | Design, protocol spec, measurements, milestones |

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
