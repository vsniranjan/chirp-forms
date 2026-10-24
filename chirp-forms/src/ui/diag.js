import { Protocol } from '../audio/ggwave.js';

// Link test between two phones (the M0 spike, kept as a diagnostics screen). Measures airtime,
// success rate, and verifies byte-exact delivery of a known pattern. Bypasses the frame protocol.

const TEST_MAGIC = 0x43;

function testPayload(len, seq) {
  const p = new Uint8Array(len);
  p[0] = TEST_MAGIC;
  p[1] = len;
  p[2] = seq & 0xff;
  for (let i = 3; i < len; i++) p[i] = (i * 37 + seq) & 0xff;
  return p;
}

function verifyPayload(bytes) {
  if (bytes.length < 3 || bytes[0] !== TEST_MAGIC) return { kind: 'text', text: new TextDecoder().decode(bytes) };
  const len = bytes[1];
  const seq = bytes[2];
  const expected = testPayload(len, seq);
  const ok = bytes.length === len && expected.every((b, i) => b === bytes[i]);
  return { kind: 'test', ok, len, seq, got: bytes.length };
}

export function mountDiag(app, radio) {
app.innerHTML = `
  <h1>Chirp Forms <span id="net" class="badge"></span></h1>
  <a href="#/" class="btn secondary small">&larr; Back</a>

  <section class="panel">
    <h2>Link test</h2>
    <div class="row">
      <div style="flex:1">
        <label>Protocol</label>
        <select id="protocol">
          <option value="AUDIBLE_NORMAL" selected>Audible NORMAL (~10 B/s, robust)</option>
          <option value="AUDIBLE_FAST">Audible FAST (~15 B/s)</option>
          <option value="AUDIBLE_FASTEST">Audible FASTEST (~28 B/s)</option>
          <option value="ULTRASOUND_FASTEST">Ultrasound FASTEST</option>
          <option value="ULTRASOUND_FAST">Ultrasound FAST</option>
        </select>
      </div>
      <div style="flex:1">
        <label>Payload</label>
        <select id="size">
          <option value="16">16 B</option>
          <option value="32" selected>32 B</option>
          <option value="64">64 B</option>
          <option value="128">128 B</option>
        </select>
      </div>
    </div>
    <div>
      <label>Volume <span id="volLabel">50</span></label>
      <input id="volume" type="range" min="5" max="100" value="50" />
    </div>
    <div class="stat" id="airtime"></div>
    <div class="row">
      <button id="send" style="flex:1">Send test chirp</button>
      <button id="listen" class="secondary" style="flex:1">Start listening</button>
    </div>
  </section>

  <section class="panel">
    <h2>Free text</h2>
    <textarea id="text" placeholder="Short message to chirp"></textarea>
    <button id="sendText" class="secondary">Send text</button>
  </section>

  <section class="panel">
    <h2>Log <span class="stat" id="score"></span></h2>
    <pre class="log" id="log"></pre>
    <button id="clear" class="secondary">Clear</button>
  </section>
`;

const $ = (id) => document.getElementById(id);
const log = (msg, cls = '') => {
  const t = new Date().toLocaleTimeString([], { hour12: false });
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = `[${t}] ${msg}`;
  $('log').prepend(line);
};

const updateNet = () => {
  const el = $('net');
  el.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  el.className = `badge ${navigator.onLine ? 'online' : 'offline'}`;
};
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);
updateNet();

let seq = 0;
let received = 0;
let corrupt = 0;

const getRadio = async () => radio;

const protocol = () => Protocol[$('protocol').value];
const size = () => Number($('size').value);
const volume = () => Number($('volume').value);

async function refreshAirtime() {
  const r = await getRadio();
  const secs = r.airtime(testPayload(size(), 0), protocol());
  $('airtime').textContent = `Estimated airtime: ${secs.toFixed(1)} s  (${(size() / secs).toFixed(1)} B/s effective)`;
}

$('protocol').addEventListener('change', refreshAirtime);
$('size').addEventListener('change', refreshAirtime);
$('volume').addEventListener('input', () => ($('volLabel').textContent = volume()));

$('send').addEventListener('click', async () => {
  const r = await getRadio();
  const payload = testPayload(size(), ++seq);
  $('send').disabled = true;
  $('send').classList.add('pulse');
  log(`TX #${seq} ${payload.length} B via ${$('protocol').value} vol=${volume()} ...`);
  const t0 = performance.now();
  try {
    await r.send(payload, { protocol: protocol(), volume: volume() });
    log(`TX #${seq} done in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  } catch (e) {
    log(`TX failed: ${e.message}`, 'bad');
  } finally {
    $('send').disabled = false;
    $('send').classList.remove('pulse');
  }
});

$('sendText').addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text) return;
  const r = await getRadio();
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 140) return log(`Too long: ${bytes.length} B (max 140)`, 'bad');
  log(`TX text ${bytes.length} B (${r.airtime(bytes, protocol()).toFixed(1)} s) ...`);
  await r.send(bytes, { protocol: protocol(), volume: volume() });
  log('TX text done');
});

$('listen').addEventListener('click', async () => {
  const r = await getRadio();
  if (r.listening) {
    r.stopListening();
    $('listen').textContent = 'Start listening';
    $('listen').classList.remove('pulse');
    log('RX stopped');
    return;
  }
  try {
    await r.listen((bytes) => {
      const v = verifyPayload(bytes);
      if (v.kind === 'text') return log(`RX text: "${v.text}"`, 'ok');
      received++;
      if (!v.ok) corrupt++;
      $('score').textContent = `${received - corrupt}/${received} ok`;
      log(`RX #${v.seq} ${v.got}/${v.len} B ${v.ok ? 'OK' : 'CORRUPT'}`, v.ok ? 'ok' : 'bad');
    });
    $('listen').textContent = 'Stop listening';
    $('listen').classList.add('pulse');
    log('RX listening...');
  } catch (e) {
    log(`Mic error: ${e.message}`, 'bad');
  }
});

$('clear').addEventListener('click', () => {
  $('log').innerHTML = '';
  received = corrupt = 0;
  $('score').textContent = '';
});

refreshAirtime().catch((e) => log(`init error: ${e.message}`, 'bad'));
}
