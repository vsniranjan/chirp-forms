import './style.css';
import { createRadio } from './audio/ggwave.js';
import { h, keepAwake, netBadge } from './ui/components.js';
import { mountSupervisor } from './ui/supervisor.js';
import { mountWorker } from './ui/worker.js';
import { mountDiag } from './ui/diag.js';
import { mountInfoSender, mountInfoReceiver } from './ui/information.js';
import { prepareOffline } from './offline.js';

const ROUTES = {
  broadcast: { mount: mountInfoSender, passive: true, title: 'Broadcast information', blurb: 'Create useful cards and broadcast updates to nearby phones.' },
  saved: { mount: mountInfoReceiver, passive: true, title: 'Saved information', blurb: 'Receive, keep and search useful details. No copying or remembering.' },
  supervisor: { mount: mountSupervisor, title: 'Supervisor', blurb: 'Build a form, broadcast it, collect entries, export CSV.' },
  worker: { mount: mountWorker, title: 'Field worker', blurb: 'Receive the form, fill entries offline, send them back.' },
  diag: { mount: mountDiag, title: 'Link test', blurb: 'Raw send/receive test between two phones.' },
};

const app = document.querySelector('#app');
prepareOffline();
// Load the WASM modem up front so the tap that starts audio isn't delayed past the gesture window.
const radioReady = createRadio();
radioReady.catch(() => {});

async function start(route) {
  try {
    if (ROUTES[route].passive) return await ROUTES[route].mount(app, () => radioReady);
    const radio = await radioReady;
    keepAwake();
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
    h('p', { class: 'tagline' }, 'Useful information, carried by sound. Save it, search it, and keep it up to date — without a network.'),
    ...['broadcast', 'saved'].map((r) =>
      h('button', { class: 'role-card', onclick: () => go(r) }, h('div', { class: 'role-title' }, ROUTES[r].title), h('div', { class: 'stat' }, ROUTES[r].blurb))
    ),
    h('details', { class: 'panel' }, h('summary', {}, 'Forms and diagnostics'),
      h('div', { class: 'row' },
        h('a', { href: '#/supervisor', class: 'btn secondary' }, 'Supervisor'),
        h('a', { href: '#/worker', class: 'btn secondary' }, 'Field worker'),
        h('a', { href: '#/diag', class: 'btn secondary' }, 'Link test')))
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
ROUTES[route] ? (ROUTES[route].passive ? start(route) : gate(route)) : home();
