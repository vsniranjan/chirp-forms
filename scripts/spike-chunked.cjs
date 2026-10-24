const factory = require('ggwave');
factory().then((ggwave) => {
  ggwave.disableLog();
  const pid = ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL;
  for (let trial = 0; trial < 3; trial++) {
    const params = ggwave.getDefaultParameters();
    const inst = ggwave.init(params);
    const payload = new Uint8Array(128).map((_, i) => ((i % 64) * 37 + 200) & 0xff);
    const wf = ggwave.encode(inst, payload, pid, 10);
    const dec = ggwave.decode(inst, wf);
    const ok = dec.length === 128 && payload.every((b, i) => b === (dec[i] & 0xff));
    console.log(`fresh instance trial ${trial}: len=${dec.length} ok=${ok}`);
    ggwave.free(inst);
  }
  // feed waveform in 1024-sample chunks like the browser will
  const params = ggwave.getDefaultParameters();
  const inst = ggwave.init(params);
  const payload = new Uint8Array(128).map((_, i) => ((i % 64) * 37 + 200) & 0xff);
  const wf = ggwave.encode(inst, payload, pid, 10);
  const f32 = new Float32Array(wf.buffer.slice(wf.byteOffset, wf.byteOffset + wf.byteLength));
  let got = null;
  for (let i = 0; i < f32.length; i += 1024) {
    const chunk = f32.slice(i, i + 1024);
    const bytes = new Uint8Array(chunk.buffer);
    const r = ggwave.decode(inst, bytes);
    if (r.length) got = Uint8Array.from(r);
  }
  // also feed 1s of silence to flush
  for (let i = 0; i < 48; i++) { const r = ggwave.decode(inst, new Uint8Array(4096)); if (r.length) got = Uint8Array.from(r); }
  const ok = got && got.length === 128 && payload.every((b, i) => b === got[i]);
  console.log(`chunked feed: got=${got ? got.length : 0} ok=${!!ok}`);
});
