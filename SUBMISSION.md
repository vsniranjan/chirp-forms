# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers. Do not submit your project to the template repository.

## Project

- **Project name:** Chirp Forms
- **Short description:** Chirp broadcasts disaster-information cards over sound. Nearby listening phones save places, supplies, contacts and instructions as a searchable local reference. Newer broadcasts update the same records, including closure notices; older replays cannot undo them. Existing two-way form collection remains available as a secondary feature. New implementation is pending participant verification.
- **Code repository URL:** https://github.com/vsniranjan/chirp-forms
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Local demo — see [README › Run the project](README.md#run-the-project) and [Demo walkthrough](README.md#demo-walkthrough).
- **Demo access requirements:** Two or more Android phones with Chrome, a laptop running the dev server on the same Wi-Fi, and microphone permission. No accounts or credentials.

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
- **Checks performed and results:** Previous forms baseline: 32 unit tests, production build and 25 smoke checks were recorded passing before this change; raw phone-to-phone chirps were confirmed. New information/PWA implementation: **tests, build and demos not run**, at participant request. Unit and smoke scenarios are provided; all new verification is TODO.
- **Known limitations or incomplete features:** About 10–28 bytes/s; short cards only, one sender at a time, foreground mic listening. New UI English; authored information is not translated. Broadcast source IDs are not authentication. iOS untested. First load needs connectivity and production caching needs trusted HTTPS. No deployment or phone-cache setup has been performed. Maps/calls have external requirements. Loudspeaker `.wav` export deferred.
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
