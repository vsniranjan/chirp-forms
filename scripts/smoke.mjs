// Headless end-to-end smoke test: drives the real app in Chrome via the DevTools protocol (no deps).
// Chrome's fake mic is fed a WAV of a real ggwave chirp, so the browser Rx path (mic -> decode ->
// frame -> codec -> UI) is exercised for real. Needs `npm run dev` running.
//   node scripts/smoke.mjs [https://localhost:5173]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ggwave_factory from 'ggwave';
import { split } from '../src/protocol/chunker.js';
import { MsgType } from '../src/protocol/frame.js';
import { encodeEntries, encodeForm } from '../src/protocol/codec.js';
import { PRESETS } from '../src/presets.js';

const BASE = process.argv[2] ?? 'https://localhost:5173';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const work = mkdtempSync(join(tmpdir(), 'chirp-smoke-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
};

// ---------- chirp WAV generation ----------
const ggwave = await ggwave_factory();
ggwave.disableLog();
function chirpWav(name, frame) {
  const params = ggwave.getDefaultParameters();
  const inst = ggwave.init(params);
  const view = ggwave.encode(inst, frame, ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL, 50);
  const f32 = new Float32Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  ggwave.free(inst);
  const sr = params.sampleRateOut;
  const pad = sr; // 1 s silence each side
  const n = f32.length + 2 * pad;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < f32.length; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, f32[i])) * 32767, 44 + (pad + i) * 2);
  const path = join(work, `${name}.wav`);
  writeFileSync(path, buf);
  return path;
}

const form = { id: 42, ...PRESETS.rapidNeeds };
const formWav = chirpWav('form', split(MsgType.FORM, 0x1111, encodeForm(form))[0]);
const entriesWav = chirpWav('entries', split(MsgType.ENTRIES, 0x2222,
  encodeEntries(form, 0xa1b2, [{ seq: 1, values: [12, 5, 1, true, 'Medical', 'roof gone'] }]))[0]);

// ---------- minimal CDP client ----------
async function launch(port, micWav) {
  const profile = join(work, `profile-${port}`);
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--ignore-certificate-errors', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ];
  if (micWav) args.splice(6, 0, `--use-file-for-fake-audio-capture=${micWav}`);
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let url;
  for (let i = 0; i < 50 && !url; i++) {
    try {
      url = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {}
    if (!url) await sleep(200);
  }
  if (!url) throw new Error('Chrome did not start');
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let nextId = 1;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) return pending.get(msg.id)(msg), pending.delete(msg.id);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description);
    return res.result?.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return {
    errors,
    evaluate,
    async open(path) {
      await send('Page.navigate', { url: `${BASE}/${path}` });
      await sleep(1500);
    },
    async waitFor(expression, timeoutMs = 10000) {
      for (const t0 = Date.now(); Date.now() - t0 < timeoutMs; await sleep(250)) if (await evaluate(expression).catch(() => false)) return true;
      return false;
    },
    click: (sel, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})]
      .find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`),
    close() {
      ws.close();
      proc.kill();
    },
  };
}

const text = (s) => `document.body.textContent.includes(${JSON.stringify(s)})`;

try {
  // 1. Screens render, broadcast completes (silent mic).
  let b = await launch(9333);
  await b.open('');
  check('home shows both roles', await b.waitFor(`document.querySelectorAll('.role-card').length === 2`));
  check('supervisor opens', await b.click('.role-card', 'Supervisor'));
  check('builder renders preset', await b.waitFor(`document.querySelectorAll('.field-row').length === 6`));
  const cost = await b.evaluate(`[...document.querySelectorAll('.stat')].map((e) => e.textContent).find((t) => t.includes('bytes')) ?? ''`);
  check('form cost shown', /13 bytes/.test(cost), cost);
  check('broadcast clicked', await b.click('button', 'Broadcast form'));
  check('broadcast completes', await b.waitFor(`[...document.querySelectorAll('button')].some((x) => x.textContent === 'Broadcast again' && !x.disabled)`, 20000));
  await b.open('#/diag');
  check('diag gate', await b.click('.role-card', 'Continue as Link test'));
  check('diag renders', await b.waitFor(`!!document.getElementById('send')`));
  check('no runtime errors (screens)', b.errors.length === 0, b.errors.join(' | '));
  b.close();

  // 2. Worker hears a real FORM chirp through the (fake) mic.
  b = await launch(9334, formWav);
  await b.open('#/worker');
  check('worker gate', await b.click('.role-card', 'Continue as Field worker'));
  check('worker receives form over mic', await b.waitFor(text('Save entry'), 20000));
  check('received form has all fields', await b.waitFor(`document.querySelectorAll('.field').length === 6`));
  await b.evaluate(`(() => { const n = document.querySelectorAll('.field input[type=number]'); n[0].value = '7'; n[1].value = '4';
    [...document.querySelectorAll('button.seg')].find((x) => x.textContent === 'Yes').click(); })()`);
  await b.click('button', 'Save entry');
  check('entry saved locally', await b.waitFor(text('Saved entries (1)')));
  check('send button armed', await b.waitFor(text('Send 1 entry to supervisor')));

  check('switch worker to Malayalam', await b.click('button.seg', 'മലയാളം'));
  check('form labels shown in Malayalam', await b.waitFor(text('അടിയന്തര ആവശ്യ സർവേ') + ' && ' + text('ആളുകൾ') + ' && ' + text('സേവ് ചെയ്യുക')));
  check('earlier entry summary translated', await b.waitFor(text('വെള്ളം: അതെ')));
  await b.evaluate(`(() => { document.querySelectorAll('.field input[type=number]')[1].value = '3';
    [...document.querySelectorAll('button.seg')].find((x) => x.textContent === 'വൈദ്യസഹായം').click(); })()`);
  await b.click('button', 'സേവ് ചെയ്യുക');
  check('Malayalam send button', await b.waitFor(text('2 എണ്ണം സൂപ്പർവൈസർക്ക് അയയ്ക്കുക')));
  const stored = await b.evaluate(`JSON.parse(localStorage.getItem('chirp:worker')).entries.at(-1).values`);
  check('answer stored as canonical English', stored?.[1] === 3 && stored?.[4] === 'Medical', JSON.stringify(stored));
  check('no runtime errors (worker)', b.errors.length === 0, b.errors.join(' | '));
  b.close();

  // 3. Supervisor hears a real ENTRIES chirp, merges it, and ACKs.
  b = await launch(9335, entriesWav);
  await b.open('');
  await b.evaluate(`localStorage.setItem('chirp:supervisor', ${JSON.stringify(JSON.stringify({
    draft: { ...form, locked: true }, forms: { 42: form }, results: {}, activeId: 42,
  }))})`);
  await b.open('#/supervisor');
  check('supervisor gate', await b.click('.role-card', 'Continue as Supervisor'));
  check('supervisor receives entry over mic', await b.waitFor(text('W-A1B2 #1'), 20000));
  check('values decoded into table', await b.waitFor(text('roof gone') + ' && ' + text('Medical')));
  check('supervisor sends receipt (ACK)', await b.waitFor(text('Sent receipt'), 10000));
  check('no runtime errors (supervisor)', b.errors.length === 0, b.errors.join(' | '));
  b.close();
} catch (err) {
  check('smoke run', false, err.stack);
} finally {
  await sleep(800);
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
process.exit(failures.length ? 1 : 0);
