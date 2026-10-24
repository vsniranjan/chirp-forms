import './style.css';
import { createRadio } from './audio/ggwave.js';
import { appBar, h, keepAwake } from './ui/components.js';
import { icon } from './ui/icons.js';
import { mountSupervisor } from './ui/supervisor.js';
import { mountWorker } from './ui/worker.js';
import { mountDiag } from './ui/diag.js';
import { mountInfoSender, mountInfoReceiver } from './ui/information.js';
import { prepareOffline } from './offline.js';

const ROUTES = {
  broadcast: { mount: mountInfoSender, passive: true, title: 'Broadcast information', blurb: 'Share a card. Keep everyone updated.' },
  saved: { mount: mountInfoReceiver, passive: true, title: 'Saved information', blurb: 'Listen, save and find what you need.' },
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
    appBar(),
    h('section', { class: 'home-intro' },
      h('span', { class: 'eyebrow' }, icon('waves', 16), 'A little sound. Useful information.'),
      h('h1', { class: 'home-title' }, 'Keep good information', h('br'), h('span', {}, 'within reach.')),
      h('p', { class: 'tagline' }, 'Share nearby. Save on your phone. No network needed.')),
    ...['broadcast', 'saved'].map((r) =>
      h('button', { class: `role-card role-${r}`, onclick: () => go(r) },
        h('span', { class: 'role-icon' }, icon(r === 'broadcast' ? 'broadcast' : 'library', 28)),
        h('span', { class: 'role-copy' }, h('span', { class: 'role-title' }, ROUTES[r].title), h('span', { class: 'stat' }, ROUTES[r].blurb)),
        icon('arrow'))
    ),
    h('div', { class: 'home-footnote' }, icon('shield', 17), 'Saved on your phone. Ready when you need it.'),
    h('details', { class: 'panel secondary-tools' }, h('summary', {}, 'Forms and diagnostics'),
      h('div', { class: 'row' },
        h('a', { href: '#/supervisor', class: 'btn secondary' }, 'Supervisor'),
        h('a', { href: '#/worker', class: 'btn secondary' }, 'Field worker'),
        h('a', { href: '#/diag', class: 'btn secondary' }, 'Link test')))
  );
}

// Audio needs a user gesture, so a reload on a role URL shows one tap-to-start button.
function gate(route) {
  app.replaceChildren(
    appBar(),
    h('button', { class: 'role-card', onclick: () => start(route) }, h('div', { class: 'role-title' }, `Continue as ${ROUTES[route].title}`), h('div', { class: 'stat' }, 'Tap to start the microphone')),
    h('a', { href: '#/', class: 'btn secondary small' }, 'Switch role')
  );
}

window.addEventListener('hashchange', () => location.reload());
window.addEventListener('popstate', () => location.reload());

const route = location.hash.replace(/^#\/?/, '');
ROUTES[route] ? (ROUTES[route].passive ? start(route) : gate(route)) : home();
