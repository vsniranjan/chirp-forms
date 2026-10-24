# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers. Do not submit your project to the template repository.

## Project

- **Project name:** Chirp Forms
- **Short description:** Disaster-relief crews often work where there is no network. Chirp Forms lets a coordinator broadcast a data-collection form to every phone in earshot as a short chirp of sound. Workers fill entries offline and chirp them back. The coordinator's phone merges the entries and exports CSV. There is no internet, Bluetooth pairing or app install, and it works on any phone with a speaker, a mic and a browser.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Local demo — see [README › Run the project](README.md#run-the-project) and [Demo walkthrough](README.md#demo-walkthrough).
- **Demo access requirements:** Two or more Android phones with Chrome, a laptop running the dev server on the same Wi-Fi, and microphone permission. No accounts or credentials.

## Participants

Participate solo or in a team of up to 4. Remove unused rows.

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Node.js 24 (tested 24.16), npm 11, Android phones with Chrome.
- **Install command:** `cd chirp-forms && npm install`
- **Required environment variable names:** None.
- **Start command:** `npm run dev`, then open `https://<LAN-IP>:5173` on each phone and accept the self-signed certificate.
- **Demo walkthrough:** Supervisor phone broadcasts the *Rapid Needs* form → worker phone shows "Form received" → worker saves an entry and taps Send → the row appears on the supervisor and the worker shows "Delivered" → export CSV. Repeat in airplane mode.
- **Checks performed and results:** `npm test` 29/29 passing. `npm run build` OK. `npm run smoke` 20/20 checks in headless Chrome with real chirp audio. Raw phone-to-phone chirp verified on two Android phones. Full flow on real phones: TODO.
- **Known limitations or incomplete features:** About 10–28 bytes/s, so text and numbers only. One sender at a time. iOS untested. The first page load needs the network (offline PWA planned). Loudspeaker `.wav` mode planned.
- **Libraries, APIs, and public datasets used:** [ggwave](https://github.com/ggerganov/ggwave) (MIT, Georgi Gerganov) as the sound modem; Vite, @vitejs/plugin-basic-ssl and Vitest (MIT). No datasets.
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project implementation started from scratch at the event.
- [ ] I participated solo or with no more than 4 team members in total.
- [ ] Codex was used during development and its usage is documented.
- [ ] The code repository URL, short description, and working demo are provided.
- [ ] README setup and demo instructions match the submitted code.
- [ ] Actual checks and known limitations are documented.
- [ ] Meaningful changes are documented and committed throughout development.
- [ ] The final implementation is committed and pushed, and its SHA is recorded above.
- [ ] No credentials or private data are included in the repository or demo instructions.
- [ ] The organizers' announced submission method and timing have been followed.

Event reference: [DevDay Exchange Community: Kochi on Luma](https://luma.com/z10nz8gp). The event wraps up by **10:00 AM IST on 11 October 2026**.
