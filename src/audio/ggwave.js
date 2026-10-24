import ggwave_factory from 'ggwave';

const SAMPLE_RATE = 48000;
const RX_BUFFER = 1024;

export const Protocol = Object.freeze({
  AUDIBLE_NORMAL: 'GGWAVE_PROTOCOL_AUDIBLE_NORMAL',
  AUDIBLE_FAST: 'GGWAVE_PROTOCOL_AUDIBLE_FAST',
  AUDIBLE_FASTEST: 'GGWAVE_PROTOCOL_AUDIBLE_FASTEST',
  ULTRASOUND_FAST: 'GGWAVE_PROTOCOL_ULTRASOUND_FAST',
  ULTRASOUND_FASTEST: 'GGWAVE_PROTOCOL_ULTRASOUND_FASTEST',
});

/**
 * Thin half-duplex radio over ggwave. One instance per page.
 * - send(bytes) plays a chirp and resolves when playback ends; Rx is muted meanwhile.
 * - listen(onBytes) streams mic samples into the decoder and calls back with a copied Uint8Array.
 */
export async function createRadio() {
  const ggwave = await ggwave_factory();
  ggwave.disableLog();

  let ctx = null;
  let instance = null;
  let micStream = null;
  let micSource = null;
  let processor = null;
  let onBytes = null;
  let transmitting = false;

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const params = ggwave.getDefaultParameters();
    params.sampleRateInp = ctx.sampleRate;
    params.sampleRateOut = ctx.sampleRate;
    instance = ggwave.init(params);
  }

  function encode(bytes, protocol, volume) {
    ensureContext();
    const view = ggwave.encode(instance, bytes, ggwave.ProtocolId[protocol], volume);
    // encode returns a view into a static buffer; copy before the next call overwrites it
    return new Float32Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }

  function play(samples) {
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    return new Promise((resolve) => {
      source.onended = resolve;
      source.start(0);
    });
  }

  async function send(bytes, { protocol = Protocol.AUDIBLE_FASTEST, volume = 50 } = {}) {
    if (ctx?.state === 'suspended') await ctx.resume();
    const samples = encode(bytes, protocol, volume);
    transmitting = true;
    try {
      await play(samples);
    } finally {
      transmitting = false;
    }
    return samples.length / ctx.sampleRate;
  }

  function airtime(bytes, protocol = Protocol.AUDIBLE_FASTEST) {
    return encode(bytes, protocol, 10).length / SAMPLE_RATE;
  }

  async function listen(callback) {
    ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    onBytes = callback;
    if (processor) return;

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
    });
    micSource = ctx.createMediaStreamSource(micStream);
    processor = ctx.createScriptProcessor(RX_BUFFER, 1, 1);
    processor.onaudioprocess = (e) => {
      if (transmitting) return;
      const f32 = e.inputBuffer.getChannelData(0);
      const res = ggwave.decode(instance, new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength));
      if (res && res.length > 0) onBytes?.(Uint8Array.from(res));
    };
    micSource.connect(processor);
    processor.connect(ctx.destination);
  }

  function stopListening() {
    if (!processor) return;
    processor.disconnect();
    micSource.disconnect();
    micStream.getTracks().forEach((t) => t.stop());
    processor = micSource = micStream = null;
    onBytes = null;
  }

  return {
    send,
    listen,
    stopListening,
    airtime,
    encode,
    get listening() {
      return processor !== null;
    },
    get sampleRate() {
      return SAMPLE_RATE;
    },
  };
}
