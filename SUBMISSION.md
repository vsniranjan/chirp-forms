# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers. Do not submit your project to the template repository.

## Project

- **Project name:** Chirp Forms
- **Short description:** Chirp broadcasts disaster-information cards over sound. Nearby listening phones save places, supplies, contacts and instructions as a searchable local reference. Newer broadcasts update the same records, including closure notices; older replays cannot undo them. Existing two-way form collection remains available as a secondary feature. The participant reports the information flow works; the latest UI polish awaits review.
- **Code repository URL:** https://github.com/vsniranjan/chirp-forms
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** [Hosted production demo](https://chirp-offline-relief.socialmacaw16.chatgpt.site/) — Sites publication succeeded for application source `f1b34a1`. Load online once and wait for Available offline before disconnecting. See the [walkthrough](README.md#try-it-in-a-minute) and [local setup](README.md#run-locally).
- **Demo access requirements:** Two or more Android phones with Chrome, an initial connection to load/cache the hosted app, and microphone permission. Public link, no accounts. Laptop/Wi-Fi are needed only for the alternative local-development setup.

## Participants

Participate solo or in a team of up to 4. Remove unused rows.

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| Niranjan | [@vsniranjan](https://github.com/vsniranjan) | Solo: idea, product decisions, on-device testing, direction of Devin and Codex |

## Run and demonstrate

- **Prerequisites and versions:** Node.js 24 (tested 24.16), npm 11, Android phones with Chrome.
- **Install command:** `npm install`
- **Required environment variable names:** None.
- **Start command:** `npm run dev`, then open `https://<LAN-IP>:5173` on each phone and accept the self-signed certificate.
- **Demo walkthrough (not yet performed):** sender saves/broadcasts a water-point card; receiver listens and saves it; sender edits hours and rebroadcasts, updating the same visible card; sender marks it Closed; old replay does not reopen it; receiver reloads offline and searches water. See README for production-cache preparation. Forms remain accessible separately.
- **Checks performed and results:** Previous forms baseline: 32 unit tests and 25 smoke checks were recorded passing; raw phone-to-phone chirps were confirmed. On 2026-10-25, the participant manually confirmed broadcast reception, two distinct cards and updating the first card after sending the second, all with correct client data. Production build succeeded for the hosted deployment. Device/range/offline and closure/replay checks were not specified; expanded automated tests/smoke remain unrun by Codex at participant request.
- **Known limitations or incomplete features:** About 10–28 bytes/s; short cards only, one sender at a time, foreground mic listening. New UI English; authored information is not translated. Broadcast source IDs are not authentication. iOS untested. First load needs connectivity; production is hosted, but phone offline-reload confirmation is pending. Maps/calls have external requirements. Loudspeaker `.wav` export deferred.
- **Libraries, APIs, and public datasets used:** [ggwave](https://github.com/ggerganov/ggwave) (MIT, Georgi Gerganov) as the sound modem; Vite, @vitejs/plugin-basic-ssl and Vitest (MIT). No datasets.
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project follows the organizers' current project-start and eligibility instructions.
- [ ] The participation format follows the organizers' current instructions.
- [ ] Any AI usage record included accurately identifies the tools used; this template requires no particular AI tool or provider.
- [ ] The code repository URL, short description, and working demo are provided.
- [ ] README setup and demo instructions match the submitted code.
- [ ] Actual checks and known limitations are documented.
- [ ] Meaningful changes are documented and committed throughout development.
- [ ] The final implementation is committed and pushed, and its SHA is recorded above.
- [ ] No credentials or private data are included in the repository or demo instructions.
- [ ] The organizers' announced submission method and timing have been followed.

Event: **Devin Hack Kochi**. Follow the organizers' current submission method and deadline. The event has no major AI usage constraints.
