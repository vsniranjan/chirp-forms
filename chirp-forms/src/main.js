import './style.css';
import { createRadio } from './audio/ggwave.js';
import { h, keepAwake, netBadge } from './ui/components.js';
import { mountSupervisor } from './ui/supervisor.js';
import { mountWorker } from './ui/worker.js';
import { mountDiag } from './ui/diag.js';

const ROUTES = {
  supervisor: { mount: mountSupervisor, title: 'Supervisor', blurb: 'Build a form, broadcast it, collect entries, export CSV.' },
  worker: { mount: mountWorker, title: 'Field worker', blurb: 'Receive the form, fill entries offline, send them back.' },
  diag: { mount: mountDiag, title: 'Link test', blurb: 'Raw send/receive test between two phones.' },
};

const app = document.querySelector('#app');
// Load the WASM modem up front so the tap that starts audio isn't delayed past the gesture window.
const radioReady = createRadio();

async function start(route) {
  const radio = await radioReady;
  keepAwake();
  try {
    await ROUTES[route].mount(app, radio);
  } catch (err) {
    app.prepend(h('div', { class: 'panel bad' }, `Microphone unavailable: ${err.message}. Allow mic access and reload.`));
  }
}

function go(route) {
  history.pushState(null, '', `#/${route}`);
  start(route);
}

function home() {
  app.replaceChildren(
    h('h1', {}, h('span', {}, 'Chirp Forms'), netBadge()),
    h('p', { class: 'tagline' }, 'Forms that travel by sound. No internet, no pairing — one chirp reaches every phone in the room.'),
    ...['supervisor', 'worker'].map((r) =>
      h('button', { class: 'role-card', onclick: () => go(r) }, h('div', { class: 'role-title' }, ROUTES[r].title), h('div', { class: 'stat' }, ROUTES[r].blurb))
    ),
    h('button', { class: 'secondary small', onclick: () => go('diag') }, 'Link test (diagnostics)')
  );
}

// Audio needs a user gesture, so a reload on a role URL shows one tap-to-start button.
function gate(route) {
  app.replaceChildren(
    h('h1', {}, h('span', {}, 'Chirp Forms'), netBadge()),
    h('button', { class: 'role-card', onclick: () => start(route) }, h('div', { class: 'role-title' }, `Continue as ${ROUTES[route].title}`), h('div', { class: 'stat' }, 'Tap to start the microphone')),
    h('a', { href: '#/', class: 'btn secondary small' }, 'Switch role')
  );
}

window.addEventListener('hashchange', () => location.reload());
window.addEventListener('popstate', () => location.reload());

const route = location.hash.replace(/^#\/?/, '');
ROUTES[route] ? gate(route) : home();
