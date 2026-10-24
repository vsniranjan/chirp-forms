import { createLink } from '../protocol/link.js';
import { MsgType } from '../protocol/frame.js';
import { decodeEntries, encodeForm, peekEntries, FieldType, MAX_OPTIONS } from '../protocol/codec.js';
import { split } from '../protocol/chunker.js';
import { LABELS, LABEL_INDEX, PRESETS } from '../presets.js';
import { settings, supervisorStore } from '../store.js';
import { activityLog, describeEvent, deviceName, formatValue, h, header, sendOptions, toast } from './components.js';

const TYPE_LABELS = { number: 'Number', yesno: 'Yes / No', choice: 'Choice', text: 'Text' };
const clone = (o) => JSON.parse(JSON.stringify(o));

export function mountSupervisor(app, radio) {
  const state = supervisorStore.load();
  const newId = () => {
    let id;
    do id = 1 + ((Math.random() * 254) | 0);
    while (state.forms[id]);
    return id;
  };
  if (!state.draft) state.draft = { id: newId(), locked: false, ...clone(PRESETS.rapidNeeds) };
  const persist = () => supervisorStore.save(state);

  const log = activityLog();
  const link = createLink(radio, {
    sendOptions,
    onEvent: (e) => {
      const d = describeEvent(e);
      if (d) log.add(...d);
    },
  });

  link.on(
    MsgType.ENTRIES,
    (payload) => {
      try {
        const { formId } = peekEntries(payload);
        const form = state.forms[formId];
        if (!form) return log.add(`Entries for an unknown form (#${formId})`, 'bad');
        const { deviceId, entries } = decodeEntries(form, payload);
        const rows = (state.results[formId] ??= {});
        let added = 0;
        for (const e of entries) {
          const key = `${deviceId}:${e.seq}`;
          if (!rows[key]) {
            rows[key] = { deviceId, seq: e.seq, values: e.values, at: Date.now() };
            added++;
          }
        }
        persist();
        renderResults();
        if (added) toast(`${added} new entr${added === 1 ? 'y' : 'ies'}`, `from ${deviceName(deviceId)}`);
      } catch (err) {
        log.add(`Could not read entries: ${err.message}`, 'bad');
      }
    },
    { ack: true }
  );

  // ---------- builder ----------
  const builderEl = h('section', { class: 'panel' });
  const costEl = h('div', { class: 'stat' });
  const broadcastBtn = h('button', { class: 'big', onclick: broadcast }, 'Broadcast form');

  function formCost() {
    const d = state.draft;
    if (!d.fields.length) return { error: 'Add at least one field' };
    if (d.fields.some((f) => !f.label.trim())) return { error: 'Every field needs a label' };
    try {
      const bytes = encodeForm(d);
      const frames = split(MsgType.FORM, 0, bytes);
      const secs = frames.reduce((t, f) => t + radio.airtime(f, sendOptions().protocol), 0);
      return { bytes: bytes.length, frames: frames.length, secs };
    } catch (err) {
      return { error: err.message };
    }
  }

  function updateCost() {
    const c = formCost();
    costEl.className = c.error ? 'stat bad' : 'stat';
    costEl.textContent = c.error
      ? c.error
      : `${c.bytes} bytes · ${c.frames > 1 ? `${c.frames} chirps · ` : ''}~${c.secs.toFixed(1)} s of sound`;
    broadcastBtn.disabled = !!c.error;
  }

  const labelInput = (value, oninput) =>
    h('input', {
      value,
      list: 'labels',
      placeholder: 'Label',
      maxLength: 24,
      class: LABEL_INDEX.has(value.toLowerCase()) ? '' : 'custom',
      oninput: (e) => {
        e.target.className = LABEL_INDEX.has(e.target.value.toLowerCase()) ? '' : 'custom';
        oninput(e.target.value);
        updateCost();
      },
    });

  function fieldRow(f, i) {
    const d = state.draft;
    const edit = persist;
    return h(
      'div',
      { class: 'field-row' },
      h(
        'select',
        {
          disabled: d.locked,
          onchange: (e) => {
            f.type = e.target.value;
            if (f.type === 'choice' && !f.options?.length) f.options = ['Low', 'Medium', 'High'];
            if (f.type !== 'choice') delete f.options;
            edit();
            renderBuilder();
          },
        },
        Object.keys(FieldType).map((t) => h('option', { value: t, selected: t === f.type }, TYPE_LABELS[t]))
      ),
      Object.assign(labelInput(f.label, (v) => ((f.label = v), edit())), { disabled: d.locked }),
      d.locked ? null : h('button', { class: 'secondary icon', title: 'Remove', onclick: () => (d.fields.splice(i, 1), edit(), renderBuilder()) }, '✕'),
      f.type === 'choice'
        ? h('input', {
            class: 'options',
            disabled: d.locked,
            value: f.options.join(', '),
            placeholder: 'Options, comma separated',
            oninput: (e) => {
              f.options = e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_OPTIONS);
              edit();
              updateCost();
            },
          })
        : null
    );
  }

  function renderBuilder() {
    const d = state.draft;
    builderEl.replaceChildren(
      h('h2', {}, d.locked ? 'Form (broadcast — locked)' : 'Build form'),
      h('div', {}, h('label', {}, 'Title'), Object.assign(labelInput(d.title, (v) => ((d.title = v), persist())), { disabled: d.locked })),
      ...d.fields.map(fieldRow),
      d.locked
        ? null
        : h(
            'div',
            { class: 'row' },
            h('button', { class: 'secondary', disabled: d.fields.length >= 12, onclick: () => (d.fields.push({ type: 'number', label: '' }), persist(), renderBuilder()) }, '+ Add field'),
            h('button', { class: 'secondary', onclick: () => (Object.assign(d, clone(PRESETS.rapidNeeds)), persist(), renderBuilder()) }, 'Load preset')
          ),
      costEl,
      broadcastBtn,
      d.locked
        ? h('button', {
            class: 'secondary',
            onclick: () => {
              state.draft = { ...clone(d), id: newId(), locked: false };
              persist();
              renderBuilder();
              renderResults();
            },
          }, 'Edit as new form')
        : null,
      h('div', { class: 'stat' }, 'Orange labels are not in the shared dictionary and cost extra airtime.')
    );
    broadcastBtn.textContent = d.locked ? 'Broadcast again' : 'Broadcast form';
    updateCost();
  }

  async function broadcast() {
    const d = state.draft;
    const form = { id: d.id, title: d.title, fields: clone(d.fields) };
    let bytes;
    try {
      bytes = encodeForm(form);
    } catch (err) {
      return log.add(err.message, 'bad');
    }
    state.forms[form.id] = form;
    state.activeId = form.id;
    d.locked = true;
    persist();
    renderBuilder();
    renderResults();

    broadcastBtn.disabled = true;
    broadcastBtn.classList.add('pulse');
    broadcastBtn.textContent = 'Chirping…';
    try {
      await link.broadcast(MsgType.FORM, bytes, { repeat: settings.get().repeat });
      log.add(`Form "${form.title}" broadcast`, 'ok');
    } catch (err) {
      log.add(`Broadcast failed: ${err.message}`, 'bad');
    } finally {
      broadcastBtn.classList.remove('pulse');
      renderBuilder();
    }
  }

  // ---------- results ----------
  const resultsEl = h('section', { class: 'panel' });

  function activeForm() {
    return state.forms[state.activeId] ?? null;
  }

  function rowsFor(form) {
    return Object.values(state.results[form.id] ?? {}).sort((a, b) => a.at - b.at);
  }

  function renderResults() {
    const form = activeForm();
    if (!form) {
      resultsEl.replaceChildren(h('h2', {}, 'Results'), h('div', { class: 'stat' }, 'Broadcast a form, then entries from workers appear here.'));
      return;
    }
    const rows = rowsFor(form);
    const devices = new Set(rows.map((r) => r.deviceId)).size;
    resultsEl.replaceChildren(
      h('h2', {}, `Results · ${form.title}`),
      h('div', { class: 'stat' }, `${rows.length} entries from ${devices} worker${devices === 1 ? '' : 's'}`),
      h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Worker'), ...form.fields.map((f) => h('th', {}, f.label)))),
          h(
            'tbody',
            {},
            rows.length
              ? rows.map((r) => h('tr', {}, h('td', {}, `${deviceName(r.deviceId)} #${r.seq}`), ...r.values.map((v) => h('td', {}, formatValue(v)))))
              : h('tr', {}, h('td', { colSpan: form.fields.length + 1, class: 'stat' }, 'Waiting for entries…'))
          )
        )
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'secondary', disabled: !rows.length, onclick: () => downloadCsv(form, rows) }, 'Download CSV'),
        h('button', {
          class: 'secondary danger',
          disabled: !rows.length,
          onclick: () => confirm('Clear results for this form?') && (delete state.results[form.id], persist(), renderResults()),
        }, 'Clear')
      )
    );
  }

  app.replaceChildren(
    header('Supervisor', { onSettingsChange: updateCost, showRepeat: true }),
    h('datalist', { id: 'labels' }, LABELS.map((l) => h('option', { value: l }))),
    builderEl,
    resultsEl,
    h('section', { class: 'panel' }, h('h2', {}, h('span', { class: 'dot pulse' }), ' Listening'), log.el)
  );
  renderBuilder();
  renderResults();
  return link.start();
}

function downloadCsv(form, rows) {
  const esc = (v) => {
    const s = formatValue(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ['Worker', 'Entry', ...form.fields.map((f) => f.label), 'Received at'].map(esc).join(','),
    ...rows.map((r) => [deviceName(r.deviceId), r.seq, ...r.values, new Date(r.at).toISOString()].map(esc).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${form.title.replace(/\W+/g, '_')}_${Date.now()}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
