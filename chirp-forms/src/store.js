// localStorage persistence. Everything survives tab close / reload, which matters in the field.
const PREFIX = 'chirp:';

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

const DEFAULT_SETTINGS = { protocol: 'AUDIBLE_NORMAL', volume: 60, repeat: 1 };

export const settings = {
  get: () => ({ ...DEFAULT_SETTINGS, ...load('settings', {}) }),
  set: (patch) => save('settings', { ...settings.get(), ...patch }),
};

export function deviceId() {
  let id = load('deviceId', null);
  if (id === null) {
    id = 1 + ((Math.random() * 0xfffe) | 0);
    save('deviceId', id);
  }
  return id;
}

export const supervisorStore = {
  load: () => load('supervisor', { draft: null, forms: {}, results: {}, activeId: null }),
  save: (s) => save('supervisor', s),
};

export const workerStore = {
  load: () => load('worker', { forms: {}, currentId: null, entries: [], nextSeq: 1 }),
  save: (s) => save('worker', s),
};

/** Clears forms/entries/results but keeps this phone's device id and settings. */
export function resetData() {
  localStorage.removeItem(PREFIX + 'supervisor');
  localStorage.removeItem(PREFIX + 'worker');
}
