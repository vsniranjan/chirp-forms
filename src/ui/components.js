import { resetData, settings } from '../store.js';
import { Protocol } from '../audio/ggwave.js';
import { MsgType } from '../protocol/frame.js';

// Build DOM without innerHTML: labels arrive over the air from untrusted phones.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function netBadge() {
  const el = h('span', { class: 'badge' });
  const update = () => {
    el.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    el.className = `badge ${navigator.onLine ? 'online' : 'offline'}`;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
  return el;
}

const PROTOCOL_LABELS = {
  AUDIBLE_NORMAL: 'Robust (noisy rooms)',
  AUDIBLE_FAST: 'Balanced',
  AUDIBLE_FASTEST: 'Fast (quiet rooms)',
};

export const sendOptions = () => {
  const s = settings.get();
  return { protocol: Protocol[s.protocol], volume: s.volume };
};

export function header(role, { onSettingsChange = () => {}, showRepeat = false } = {}) {
  const s = settings.get();
  const protocol = h(
    'select',
    { onchange: (e) => (settings.set({ protocol: e.target.value }), onSettingsChange()) },
    Object.entries(PROTOCOL_LABELS).map(([v, label]) => h('option', { value: v, selected: v === s.protocol }, label))
  );
  const volLabel = h('span', {}, s.volume);
  const volume = h('input', {
    type: 'range',
    min: 10,
    max: 100,
    value: s.volume,
    oninput: (e) => ((volLabel.textContent = e.target.value), settings.set({ volume: Number(e.target.value) })),
  });
  const repeat = h(
    'select',
    { onchange: (e) => (settings.set({ repeat: Number(e.target.value) }), onSettingsChange()) },
    [1, 2, 3].map((n) => h('option', { value: n, selected: n === s.repeat }, `Broadcast x${n}`))
  );
  return h(
    'header',
    { class: 'top' },
    h('h1', {}, h('span', {}, 'Chirp Forms'), netBadge()),
    h(
      'div',
      { class: 'row between' },
      h('span', { class: 'role' }, role),
      h(
        'details',
        { class: 'settings' },
        h('summary', {}, 'Settings'),
        h('label', {}, 'Sound mode'),
        protocol,
        h('label', {}, 'Volume ', volLabel),
        volume,
        showRepeat && repeat,
        h('div', { class: 'row' },
          h('a', { href: '#/', class: 'btn secondary small' }, 'Switch role'),
          h('a', { href: '#/diag', class: 'btn secondary small' }, 'Link test'),
          h('button', {
            class: 'secondary small danger',
            onclick: () => confirm('Delete all information cards, forms, entries and results on this phone?') && (resetData(), location.reload()),
          }, 'Reset data')
        )
      )
    )
  );
}

export function toast(title, subtitle = '', ms = 2200) {
  const el = h('div', { class: 'toast', onclick: () => el.remove() }, h('div', { class: 'tick' }, '✓'), h('div', { class: 'toast-title' }, title), h('div', { class: 'stat' }, subtitle));
  document.body.append(el);
  navigator.vibrate?.([120, 60, 120]);
  setTimeout(() => el.remove(), ms);
}

export function activityLog(max = 6) {
  const el = h('div', { class: 'activity' });
  return {
    el,
    add(msg, cls = '') {
      const t = new Date().toLocaleTimeString([], { hour12: false });
      el.prepend(h('div', { class: cls }, `${t}  ${msg}`));
      while (el.childElementCount > max) el.lastChild.remove();
    },
  };
}

const TYPE_NAMES = Object.fromEntries(Object.entries(MsgType).map(([k, v]) => [v, k.toLowerCase()]));

/** Human-readable line for a link event, or null to skip. */
export function describeEvent(e) {
  const name = TYPE_NAMES[e.type] ?? 'message';
  switch (e.kind) {
    case 'tx':
      return [`Chirping ${name}${e.count > 1 ? ` ${e.chunkIdx + 1}/${e.count}` : ''}${e.round ? ' (retry)' : ''}`, ''];
    case 'rx':
      return e.status === 'partial' ? [`Hearing ${name} ${e.chunkIdx + 1}/${e.count}`, ''] : e.duplicate ? null : [`Received ${name}`, 'ok'];
    case 'ack-tx':
      return ['Sent receipt', 'ok'];
    case 'ack-rx':
      return ['Receipt heard', 'ok'];
    case 'retry':
      return [e.bitmap === null ? 'No receipt heard, retrying' : `Resending ${e.todo.length} missing part(s)`, 'warn'];
    case 'noise':
      return null;
  }
  return null;
}

export async function keepAwake() {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && navigator.wakeLock?.request('screen').catch(() => {}));
    return lock;
  } catch {
    return null;
  }
}

export const formatValue = (v) => (v === null || v === undefined ? '—' : v === true ? 'Yes' : v === false ? 'No' : String(v));
export const deviceName = (id) => `W-${id.toString(16).padStart(4, '0').toUpperCase()}`;
