import { createLink } from '../protocol/link.js';
import { MsgType, MAX_CHUNKS, MAX_PAYLOAD } from '../protocol/frame.js';
import { decodeForm, encodeEntries, MAX_TEXT } from '../protocol/codec.js';
import { deviceId, workerStore } from '../store.js';
import { activityLog, describeEvent, deviceName, formatValue, h, header, sendOptions, toast } from './components.js';

const MAX_MESSAGE = MAX_PAYLOAD * MAX_CHUNKS;

export function mountWorker(app, radio) {
  const state = workerStore.load();
  const me = deviceId();
  const persist = () => workerStore.save(state);
  const log = activityLog();
  const status = h('div', { class: 'send-status stat' });

  const link = createLink(radio, {
    sendOptions,
    onEvent: (e) => {
      const d = describeEvent(e);
      if (d) log.add(...d);
      if (e.type === MsgType.ENTRIES && e.kind === 'tx') status.textContent = `Chirping part ${e.chunkIdx + 1} of ${e.count}…`;
      if (e.kind === 'retry') status.textContent = e.bitmap === null ? 'No receipt yet — chirping again…' : `Supervisor missed ${e.todo.length} part(s) — resending…`;
    },
  });

  link.on(MsgType.FORM, (payload) => {
    let form;
    try {
      form = decodeForm(payload);
    } catch (err) {
      return log.add(`Unreadable form: ${err.message}`, 'bad');
    }
    if (state.currentId === form.id) return log.add('Form already received');
    state.forms[form.id] = form;
    state.currentId = form.id;
    persist();
    toast('Form received', `${form.title} · ${form.fields.length} fields`);
    render();
  });

  const body = h('div', { class: 'stack' });

  const current = () => state.forms[state.currentId] ?? null;
  const entriesFor = (form) => state.entries.filter((e) => e.formId === form.id);

  function control(field) {
    if (field.type === 'yesno' || field.type === 'choice') {
      const options = field.type === 'yesno' ? [['Yes', true], ['No', false]] : field.options.map((o) => [o, o]);
      let value = null;
      const buttons = options.map(([label, v]) =>
        h('button', {
          class: 'seg',
          type: 'button',
          onclick: (e) => {
            value = value === v ? null : v;
            buttons.forEach((b) => b.classList.toggle('on', b === e.currentTarget && value !== null));
          },
        }, label)
      );
      return { el: h('div', { class: 'segmented' }, buttons), get: () => value };
    }
    const input = h('input', field.type === 'number'
      ? { type: 'number', inputMode: 'numeric', step: 1 }
      : { type: 'text', maxLength: MAX_TEXT / 3, placeholder: 'Short text' });
    return {
      el: input,
      get: () => {
        const v = input.value.trim();
        if (v === '') return null;
        return field.type === 'number' ? Math.round(Number(v)) : v;
      },
    };
  }

  function entryCard(form) {
    const controls = form.fields.map(control);
    return h(
      'section',
      { class: 'panel' },
      h('h2', {}, form.title),
      ...form.fields.map((f, i) => h('div', { class: 'field' }, h('label', {}, f.label), controls[i].el)),
      h('button', {
        class: 'big',
        onclick: () => {
          const values = controls.map((c) => c.get());
          if (values.every((v) => v === null)) return toast('Nothing filled in', '', 1200);
          state.entries.push({ formId: form.id, seq: state.nextSeq, values, sent: false, at: Date.now() });
          state.nextSeq = (state.nextSeq % 255) + 1;
          persist();
          render();
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        },
      }, 'Save entry')
    );
  }

  function savedCard(form) {
    const entries = entriesFor(form);
    const unsent = entries.filter((e) => !e.sent);
    const sendBtn = h('button', { class: 'big', disabled: !unsent.length, onclick: () => send(form, unsent, sendBtn) },
      unsent.length ? `Send ${unsent.length} entr${unsent.length === 1 ? 'y' : 'ies'} to supervisor` : 'All entries sent');
    return h(
      'section',
      { class: 'panel' },
      h('h2', {}, `Saved entries (${entries.length})`),
      entries.length
        ? h('ul', { class: 'entries' }, entries.slice().reverse().map((e) =>
            h('li', {},
              h('span', { class: e.sent ? 'ok' : 'warn' }, e.sent ? '✓ sent' : '● not sent'),
              h('span', { class: 'stat' }, form.fields.map((f, i) => `${f.label}: ${formatValue(e.values[i])}`).join(' · '))
            )))
        : h('div', { class: 'stat' }, 'Saved entries stay on this phone until the supervisor confirms them.'),
      h('div', { class: 'stat' }, 'Hold the phone near the supervisor\'s phone, then tap send.'),
      sendBtn,
      status
    );
  }

  async function send(form, unsent, btn) {
    let batch = unsent;
    let bytes = encodeEntries(form, me, batch);
    while (bytes.length > MAX_MESSAGE && batch.length > 1) {
      batch = batch.slice(0, -1);
      bytes = encodeEntries(form, me, batch);
    }
    btn.disabled = true;
    btn.classList.add('pulse');
    status.className = 'send-status stat';
    status.textContent = 'Chirping…';
    try {
      const res = await link.sendReliable(MsgType.ENTRIES, bytes);
      if (res.ok) {
        batch.forEach((e) => (e.sent = true));
        persist();
        toast('Delivered', `${batch.length} entr${batch.length === 1 ? 'y' : 'ies'} confirmed by supervisor`);
        render();
        if (batch.length < unsent.length) status.textContent = 'More entries left — tap send again.';
      } else {
        status.className = 'send-status bad';
        status.textContent = 'Not confirmed. Move closer to the supervisor and try again.';
      }
    } catch (err) {
      status.className = 'send-status bad';
      status.textContent = `Send failed: ${err.message}`;
    } finally {
      btn.classList.remove('pulse');
      btn.disabled = false;
    }
  }

  function render() {
    const form = current();
    body.replaceChildren(
      ...(form
        ? [entryCard(form), savedCard(form)]
        : [
            h('section', { class: 'panel hero' },
              h('div', { class: 'ring pulse' }),
              h('div', { class: 'hero-title' }, 'Listening for a form…'),
              h('div', { class: 'stat' }, 'Keep this screen open. When the supervisor broadcasts, the form appears here — no internet needed.')),
          ]),
      h('section', { class: 'panel' }, h('h2', {}, h('span', { class: 'dot pulse' }), ` Listening · ${deviceName(me)}`), log.el)
    );
  }

  app.replaceChildren(header('Field worker'), body);
  render();
  return link.start();
}
