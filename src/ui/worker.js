import { createLink } from '../protocol/link.js';
import { MsgType, MAX_CHUNKS, MAX_PAYLOAD } from '../protocol/frame.js';
import { decodeForm, encodeEntries, MAX_TEXT } from '../protocol/codec.js';
import { deviceId, settings, workerStore } from '../store.js';
import { currentLang, LANGUAGES, tl, tu } from '../i18n.js';
import { activityLog, describeEvent, deviceName, h, header, sendOptions, toast } from './components.js';

const MAX_MESSAGE = MAX_PAYLOAD * MAX_CHUNKS;

// Values are stored canonical (true/false, English option labels); only the display is translated.
function showValue(field, v) {
  if (v === null || v === undefined) return '—';
  if (field.type === 'yesno') return v ? tu('yes') : tu('no');
  if (field.type === 'choice') return tl(v);
  return String(v);
}

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
      if (e.type === MsgType.ENTRIES && e.kind === 'tx') status.textContent = tu('chirpingPart', e.chunkIdx + 1, e.count);
      if (e.kind === 'retry') status.textContent = e.bitmap === null ? tu('retryNoAck') : tu('retryMissing', e.todo.length);
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
    toast(tu('formReceived'), `${tl(form.title)} · ${tu('fields', form.fields.length)}`);
    render();
  });

  const body = h('div', { class: 'stack' });

  const current = () => state.forms[state.currentId] ?? null;
  const entriesFor = (form) => state.entries.filter((e) => e.formId === form.id);

  function languagePicker() {
    const lang = currentLang();
    return h('div', { class: 'segmented lang', role: 'group', 'aria-label': tu('language') },
      Object.entries(LANGUAGES).map(([code, name]) =>
        h('button', { class: `seg${code === lang ? ' on' : ''}`, type: 'button', lang: code, onclick: () => (settings.set({ lang: code }), mount()) }, name)
      ));
  }

  function control(field) {
    if (field.type === 'yesno' || field.type === 'choice') {
      const options = field.type === 'yesno' ? [[tu('yes'), true], [tu('no'), false]] : field.options.map((o) => [tl(o), o]);
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
      : { type: 'text', maxLength: MAX_TEXT / 3, placeholder: tu('shortText') });
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
      h('h2', {}, tl(form.title)),
      ...form.fields.map((f, i) => h('div', { class: 'field' }, h('label', {}, tl(f.label)), controls[i].el)),
      h('button', {
        class: 'big',
        onclick: () => {
          const values = controls.map((c) => c.get());
          if (values.every((v) => v === null)) return toast(tu('nothingFilled'), '', 1200);
          state.entries.push({ formId: form.id, seq: state.nextSeq, values, sent: false, at: Date.now() });
          state.nextSeq = (state.nextSeq % 255) + 1;
          persist();
          render();
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        },
      }, tu('saveEntry'))
    );
  }

  function savedCard(form) {
    const entries = entriesFor(form);
    const unsent = entries.filter((e) => !e.sent);
    const sendBtn = h('button', { class: 'big', disabled: !unsent.length, onclick: () => send(form, unsent, sendBtn) },
      unsent.length ? tu('send', unsent.length) : tu('allSent'));
    return h(
      'section',
      { class: 'panel' },
      h('h2', {}, tu('savedEntries', entries.length)),
      entries.length
        ? h('ul', { class: 'entries' }, entries.slice().reverse().map((e) =>
            h('li', {},
              h('span', { class: e.sent ? 'ok' : 'warn' }, e.sent ? tu('sent') : tu('notSent')),
              h('span', { class: 'stat' }, form.fields.map((f, i) => `${tl(f.label)}: ${showValue(f, e.values[i])}`).join(' · '))
            )))
        : h('div', { class: 'stat' }, tu('savedHint')),
      h('div', { class: 'stat' }, tu('holdNear')),
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
    status.textContent = tu('chirping');
    try {
      const res = await link.sendReliable(MsgType.ENTRIES, bytes);
      if (res.ok) {
        batch.forEach((e) => (e.sent = true));
        persist();
        toast(tu('delivered'), tu('deliveredSub', batch.length));
        render();
        if (batch.length < unsent.length) status.textContent = tu('moreLeft');
      } else {
        status.className = 'send-status bad';
        status.textContent = tu('notConfirmed');
      }
    } catch (err) {
      status.className = 'send-status bad';
      status.textContent = tu('sendFailed', err.message);
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
              h('div', { class: 'hero-title' }, tu('listening')),
              h('div', { class: 'stat' }, tu('listeningHint'))),
          ]),
      h('section', { class: 'panel' }, h('h2', {}, h('span', { class: 'dot pulse' }), ` ${tu('listeningAs', deviceName(me))}`), log.el)
    );
  }

  function mount() {
    document.documentElement.lang = currentLang();
    app.replaceChildren(header(tu('role')), languagePicker(), body);
    render();
  }

  mount();
  return link.start();
}
