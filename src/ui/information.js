import { createLink } from '../protocol/link.js';
import { MsgType } from '../protocol/frame.js';
import { split } from '../protocol/chunker.js';
import { decodeInfo, encodeInfo, findInfo, infoKey, INFO_CATEGORIES, INFO_LIMITS, INFO_STATUSES, mergeInfo, normalizeInfo } from '../protocol/info.js';
import { deviceId, infoReceiverStore, infoSenderStore, settings } from '../store.js';
import { h, header, keepAwake, sendOptions } from './components.js';
import { icon } from './icons.js';

const categoryIcons = { places: 'pin', supplies: 'supplies', contacts: 'phone', instructions: 'note' };

const emptyCard = () => ({ category: 'places', status: 'active', title: '', details: '', phone: '', hours: '', lat: null, lon: null });
const exampleCard = () => ({ ...emptyCard(), category: 'supplies', title: 'Water point — North gate', details: 'Bring 2 empty containers.', hours: '4:30–5:00 PM', lat: 9.9816, lon: 76.2999 });
const feedback = (el, text, bad = false) => {
  el.className = bad ? 'stat bad' : 'stat';
  el.textContent = text;
};

function recordCard(record, { recent = false, actions = [] } = {}) {
  const coordinates = record.lat !== null && record.lat !== undefined;
  const mapUrl = coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.lat},${record.lon}`)}` : null;
  return h('article', { class: `panel info-card category-${record.category}${recent ? ' info-changed' : ''}`, 'data-record-key': infoKey(record) },
    h('div', { class: 'row between' },
      h('span', { class: 'category-label' }, icon(categoryIcons[record.category], 17), INFO_CATEGORIES[record.category]),
      h('span', { class: `badge info-status status-${record.status}` }, INFO_STATUSES[record.status])),
    h('h2', { class: 'info-title' }, record.title),
    record.details && h('p', { class: 'info-details' }, record.details),
    record.hours && h('div', { class: 'info-fact' }, icon('clock', 17), record.hours),
    record.phone && h('div', { class: 'info-fact' }, icon('phone', 17), record.phone),
    record.receivedAt && h('div', { class: `info-fact stat${recent ? ' info-updated' : ''}` }, icon('check', 16), recent ? 'Updated just now' : `Saved ${new Date(record.receivedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`),
    (mapUrl || record.phone) && h('div', { class: 'row card-links' },
      mapUrl && h('a', { class: 'btn secondary', href: mapUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 18), 'Open in Maps'),
      record.phone && h('a', { class: 'btn secondary', href: `tel:${record.phone.replace(/[ ()-]/g, '')}` }, icon('phone', 18), 'Call')),
    h('details', { class: 'card-meta' }, h('summary', {}, 'More details'),
      coordinates && h('div', { class: 'stat' }, `${record.lat}, ${record.lon}`),
      h('div', { class: 'stat' }, `Coordinator ${record.sourceId.toString(16).toUpperCase()} · Version ${record.version}`)),
    actions.length > 0 && h('div', { class: 'row card-actions' }, actions)
  );
}

export function mountInfoSender(app, getRadio) {
  let state = infoSenderStore.load();
  let editing = null;
  let busy = false;
  let radio = null;
  let link = null;
  const message = h('div', { class: 'stat', role: 'status', 'aria-live': 'polite' });
  const cost = h('div', { class: 'stat', 'aria-live': 'polite' });
  const list = h('div', { class: 'stack' });
  const fields = {};
  const saveButton = h('button', { type: 'submit' }, icon('save', 18), 'Save card');
  const editorTitle = h('span', {}, 'New card');

  const input = (name, title, props = {}) => {
    const control = h(name === 'details' ? 'textarea' : 'input', { name, ...props, oninput: refreshCost });
    fields[name] = control;
    return h('label', { class: 'field' }, title, control);
  };
  const select = (name, title, values) => {
    const control = h('select', { name, onchange: refreshCost }, Object.entries(values).map(([value, label]) => h('option', { value }, label)));
    fields[name] = control;
    return h('label', { class: 'field' }, title, control);
  };

  function draft() {
    const previous = editing ? state.records[editing] : null;
    return normalizeInfo({
      sourceId: previous?.sourceId ?? deviceId(), id: previous?.id ?? state.nextId, version: previous ? previous.version + 1 : 1,
      ...Object.fromEntries(['category', 'status', 'title', 'details', 'phone', 'hours'].map((name) => [name, fields[name].value])),
      lat: fields.lat.value.trim() === '' ? null : Number(fields.lat.value),
      lon: fields.lon.value.trim() === '' ? null : Number(fields.lon.value),
    });
  }

  function refreshCost() {
    try {
      const bytes = encodeInfo(draft());
      const frames = split(MsgType.INFO, 0, bytes);
      const repeat = settings.get().repeat;
      const seconds = radio ? frames.reduce((sum, frame) => sum + radio.airtime(frame, sendOptions().protocol), 0) * repeat + (repeat - 1) * 0.6 : null;
      feedback(cost, seconds === null ? `${bytes.length} bytes` : `About ${Math.ceil(seconds)} seconds to broadcast`);
      saveButton.disabled = busy;
    } catch (err) {
      const blank = !fields.title.value.trim();
      feedback(cost, blank ? 'Add a title to get started.' : err.message, !blank);
      saveButton.disabled = true;
    }
  }

  function fill(record, key = null) {
    editing = key;
    for (const name of Object.keys(fields)) fields[name].value = record[name] ?? '';
    editorTitle.textContent = key ? 'Edit card' : 'New card';
    saveButton.replaceChildren(icon('save', 18), key ? 'Save changes' : 'Save card');
    editorShell.open = true;
    extraFields.open = !!(record.hours || record.phone || record.lat !== null);
    refreshCost();
  }

  function renderList() {
    const records = Object.values(state.records).sort((a, b) => b.id - a.id);
    list.replaceChildren(...(records.length ? records.map((record) => {
      const key = infoKey(record);
      const bytes = encodeInfo(record);
      const frames = split(MsgType.INFO, 0, bytes);
      const repeat = settings.get().repeat;
      const seconds = radio ? frames.reduce((sum, frame) => sum + radio.airtime(frame, sendOptions().protocol), 0) * repeat + (repeat - 1) * 0.6 : null;
      return recordCard(record, { actions: [
        h('span', { class: 'stat card-airtime', title: `${bytes.length} bytes · ${repeat} broadcast${repeat === 1 ? '' : 's'}` }, icon('clock', 16), seconds === null ? 'Preparing sound…' : `~${Math.ceil(seconds)} sec`),
        h('button', { class: 'secondary', disabled: busy, onclick: () => { fill(record, key); fields.title.focus(); } }, icon('edit', 18), 'Edit'),
        h('button', { disabled: busy || !radio, onclick: () => broadcast(record) }, icon('broadcast', 18), 'Broadcast'),
      ] });
    }) : [h('div', { class: 'empty-state compact' }, icon('note', 28), h('p', {}, 'Your cards will appear here.'))]));
  }

  async function broadcast(record) {
    if (busy || !radio) return;
    busy = true;
    editor.querySelectorAll('input, textarea, select, button').forEach((el) => { el.disabled = true; });
    renderList();
    try {
      const bytes = encodeInfo(record);
      const frames = split(MsgType.INFO, 0, bytes);
      const repeat = settings.get().repeat;
      const seconds = frames.reduce((sum, frame) => sum + radio.airtime(frame, sendOptions().protocol), 0) * repeat + (repeat - 1) * 0.6;
      feedback(message, `Broadcasting “${record.title}” · ~${seconds.toFixed(1)} seconds…`);
      await link.broadcast(MsgType.INFO, bytes, { repeat });
      feedback(message, 'Broadcast finished.');
    } catch (err) {
      feedback(message, `Broadcast failed: ${err.message}`, true);
    } finally {
      busy = false;
      editor.querySelectorAll('input, textarea, select, button').forEach((el) => { el.disabled = false; });
      refreshCost();
      renderList();
    }
  }

  const extraFields = h('details', { class: 'extra-fields' },
    h('summary', {}, icon('pin', 17), 'Location, hours & phone'),
    h('div', { class: 'stack optional-fields' },
      input('hours', 'Opening hours', { maxLength: INFO_LIMITS.hours, placeholder: '4:30–5:00 PM' }),
      h('div', { class: 'coordinate-fields' },
        input('lat', 'Latitude', { type: 'number', step: 'any', min: -90, max: 90, placeholder: '9.9816' }),
        input('lon', 'Longitude', { type: 'number', step: 'any', min: -180, max: 180, placeholder: '76.2999' })),
      input('phone', 'Phone', { type: 'tel', maxLength: INFO_LIMITS.phone })));

  const editor = h('form', { class: 'card-editor', onsubmit: (event) => {
    event.preventDefault();
    if (busy) return;
    try {
      const record = draft();
      encodeInfo(record);
      const next = { ...state, records: { ...state.records, [infoKey(record)]: record }, nextId: editing ? state.nextId : state.nextId + 1 };
      infoSenderStore.save(next);
      state = next;
      fill(record, infoKey(record));
      renderList();
      editorShell.open = false;
      feedback(message, 'Card saved. Ready to broadcast.');
    } catch (err) {
      feedback(message, `Could not save: ${err.message}`, true);
    }
  } },
  h('div', { class: 'coordinate-fields' }, select('category', 'Category', INFO_CATEGORIES), select('status', 'Status', INFO_STATUSES)),
  input('title', 'Title', { required: true, maxLength: INFO_LIMITS.title, placeholder: 'Water point — North gate' }),
  input('details', 'Short details', { maxLength: INFO_LIMITS.details, placeholder: 'Bring 2 empty containers.' }),
  extraFields,
  cost,
  h('div', { class: 'row' }, saveButton,
    h('button', { type: 'button', class: 'text-button', onclick: () => fill(exampleCard()) }, 'Use water example')));
  const editorShell = h('details', { class: 'panel editor-shell' }, h('summary', {}, icon('plus', 19), editorTitle), editor);

  app.replaceChildren(header('Broadcast information', { onSettingsChange: () => { refreshCost(); renderList(); }, showRepeat: true }),
    h('div', { class: 'page-heading' },
      h('div', {}, h('h1', {}, 'Your cards'), h('p', { class: 'tagline' }, 'A useful update, one chirp away.')),
      h('button', { class: 'new-card-button', onclick: () => { fill(emptyCard()); fields.title.focus(); } }, icon('plus', 18), 'New card')),
    message, editorShell, list);
  fill(emptyCard());
  editorShell.open = Object.keys(state.records).length === 0;
  renderList();
  getRadio().then((ready) => {
    radio = ready;
    link = createLink(radio, { sendOptions, onEvent: (event) => {
      if (event.kind === 'tx') feedback(message, `Chirping part ${event.chunkIdx + 1}/${event.count}${event.round ? ' (repeat)' : ''}…`);
    } });
    refreshCost();
    renderList();
  }).catch((err) => feedback(message, `Sound unavailable: ${err.message}. You can still save cards.`, true));
}

export function mountInfoReceiver(app, getRadio) {
  let state = infoReceiverStore.load();
  let listening = false;
  let radio = null;
  let link = null;
  let recentKey = null;
  let highlightTimer;
  const list = h('div', { class: 'stack info-list' });
  const count = h('div', { class: 'stat' });
  const message = h('div', { class: 'stat', role: 'status', 'aria-live': 'polite' }, 'Start listening to receive nearby updates.');
  const search = h('input', { type: 'search', placeholder: 'Find water, shelter, contacts…', 'aria-label': 'Search saved information', oninput: render });
  const category = h('select', { 'aria-label': 'Filter category', onchange: render },
    h('option', { value: '' }, 'All categories'), Object.entries(INFO_CATEGORIES).map(([value, label]) => h('option', { value }, label)));
  const listenButton = h('button', { class: 'listen-button', onclick: toggleListening }, icon('mic', 21), 'Start listening');

  function render() {
    const records = findInfo(state.records, search.value, category.value);
    count.textContent = search.value || category.value ? `${records.length} of ${Object.keys(state.records).length} saved` : `${records.length} saved card${records.length === 1 ? '' : 's'}`;
    list.replaceChildren(...(records.length
      ? records.map((record) => recordCard(record, { recent: infoKey(record) === recentKey }))
      : [h('div', { class: 'empty-state' }, icon(Object.keys(state.records).length ? 'search' : 'library', 38),
        h('h2', {}, Object.keys(state.records).length ? 'No matching information' : 'A little quiet here'),
        h('p', {}, Object.keys(state.records).length ? 'Try another word or category.' : 'Start listening. New cards will appear here.'))]));
  }

  function receive(payload) {
    try {
      const record = decodeInfo(payload);
      const result = mergeInfo(state.records, record);
      if (!result.changed) return;
      const next = { records: result.records };
      infoReceiverStore.save(next);
      state = next;
      recentKey = infoKey(record);
      clearTimeout(highlightTimer);
      feedback(message, `${result.added ? 'Saved' : 'Updated'} “${record.title}” · ${INFO_STATUSES[record.status]}`);
      render();
      highlightTimer = setTimeout(() => { recentKey = null; render(); }, 8000);
    } catch (err) {
      feedback(message, `Could not save this broadcast: ${err.message}`, true);
    }
  }

  async function toggleListening() {
    listenButton.disabled = true;
    try {
      if (listening) {
        radio.stopListening();
        listening = false;
      } else {
        feedback(message, 'Starting microphone…');
        radio = await getRadio();
        if (!link) {
          link = createLink(radio, { onEvent: (event) => {
            if (event.type === MsgType.INFO && event.kind === 'rx' && event.status === 'partial') {
              feedback(message, `Receiving card · part ${event.chunkIdx + 1}/${event.count}…`);
            }
          } });
          link.on(MsgType.INFO, receive);
        }
        await link.start();
        listening = true;
        keepAwake();
      }
      listenButton.replaceChildren(icon(listening ? 'stop' : 'mic', 21), listening ? 'Stop listening' : 'Start listening');
      listenButton.classList.toggle('is-listening', listening);
      feedback(message, listening ? 'Listening · keep this screen open.' : 'Listening paused. Your cards are saved.');
    } catch (err) {
      feedback(message, `Could not start listening: ${err.message}. Allow microphone access and try again.`, true);
    } finally {
      listenButton.disabled = false;
    }
  }

  app.replaceChildren(header('Saved information'),
    h('div', { class: 'page-heading' }, h('div', {}, h('h1', {}, 'Your information'), h('p', { class: 'tagline' }, 'Saved here. Easy to find.'))),
    h('section', { class: 'listen-panel' }, h('span', { class: 'listen-symbol' }, icon('waves', 30)), h('div', { class: 'listen-copy' }, listenButton, message)),
    h('section', { class: 'search-panel' }, h('label', { class: 'search-field' }, icon('search', 20), search), category),
    count,
    list,
    h('p', { class: 'library-footnote' }, icon('shield', 15), 'Saved on this phone. Maps and calls may need connectivity.'));
  render();
}
