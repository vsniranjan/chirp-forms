# Chirp Forms — forms that travel by sound

Offline field-data collection for teams with **no network**. A supervisor's phone broadcasts a form
as a short audible chirp; every phone in earshot receives it at once. Workers fill entries offline,
then chirp them back. The supervisor's phone merges everything and exports CSV. No internet, no
Bluetooth pairing, no app install. It's a web page that uses the phone's speaker and microphone.

Built for the hackathon track **"Works Anyway"** (constraint: no connectivity). Target users:
**disaster-relief crews** doing rapid needs assessments after floods or earthquakes.

**[Event rules](RULES.md)** · **[Agent instructions](AGENTS.md)** · **[Implementation plan](PLAN.md)** · **[Change log](CHANGELOG.md)** · **[AI usage](AI_USAGE.md)**

## Event details (from the template)

| Detail | Information |
| --- | --- |
| Event | DevDay Exchange Community Hackathon: Kochi ([Luma](https://luma.com/z10nz8gp)) |
| Venue | JAIN University, Kochi — rooms 2008 and 2009 |
| Participation | Solo or a team of up to 4 participants |
| Theme | Open |

## Project overview

- **Project name:** Chirp Forms
- **Short description:** Sends small forms and responses between phones as sound (FSK data-over-audio),
  so a relief coordinator can push one form to a whole crew and collect their entries with every phone
  in airplane mode. One chirp reaches every phone in the room: no pairing, no QR aiming, and it also
  works through a loudspeaker.
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
   cd chirp-forms
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
   npm test          # 29 unit tests: frame, codec, chunker, link (simulated lossy air), real ggwave loopback
   npm run build     # production build
   npm run smoke     # headless Chrome end-to-end (needs `npm run dev` running in another terminal)
   ```

### Demo walkthrough

1. Phone A: open the app and tap **Supervisor**. The *Rapid Needs* preset form is loaded (13 bytes,
   about 2.6 s of sound). Tap **Broadcast form**.
2. Phone B: open the app and tap **Field worker**. It shows **Form received ✓** when it hears the chirp.
3. Phone B: fill an entry, tap **Save entry**, then hold it near phone A and tap **Send**.
4. Phone A: the entry appears in the results table and A chirps back a receipt. Phone B shows **Delivered**.
5. Tap **Download CSV** on phone A.
6. Repeat with airplane mode on, once the page is already loaded.

### Current status

- **Working features (verified by `npm test` and `npm run smoke`):** form builder with live
  byte/airtime cost; one-to-many form broadcast; worker form reception, offline entry storage and
  reliable send-back with ACK and selective retransmit; supervisor merge with dedup and CSV export;
  selectable sound modes; raw link-test screen.
- **Verified on real phones:** raw phone-to-phone chirp transfer on two Android phones (link-test
  screen). The full supervisor ↔ worker flow has so far only been verified headlessly (real chirp
  audio fed into Chrome's fake microphone). A real two-phone run is pending.
- **Known limitations:**
  - Bandwidth is about 10–28 bytes/s depending on sound mode, so it carries text and numbers only, not photos.
  - Half-duplex, so one worker sends at a time.
  - Untested on iOS Safari.
  - Opening the page still needs the network once; offline PWA caching is planned (M5).
  - The audible band will not survive narrowband phone calls.
- **Planned:** loudspeaker broadcast mode with a downloadable chirp `.wav` (M4); offline PWA and
  demo polish (M5). See [PLAN.md](PLAN.md).
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
| `chirp-forms/src/audio/` | Web Audio + ggwave send/listen wrapper |
| `chirp-forms/src/protocol/` | Frame format, codec, chunker, reliable link (pure, unit-tested) |
| `chirp-forms/src/ui/` | Supervisor, worker and link-test screens |
| `chirp-forms/scripts/` | Smoke test and throughput spikes |
| `PLAN.md` | Design, protocol spec, measurements, milestones |

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
