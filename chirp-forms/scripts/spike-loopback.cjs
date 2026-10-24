// M0 spike: loopback encode->decode in Node to check binary safety and airtime per protocol.
const factory = require('ggwave');

factory().then((ggwave) => {
  ggwave.disableLog();
  const params = ggwave.getDefaultParameters();
  const instance = ggwave.init(params);
  const sr = params.sampleRateOut;

  const protocols = [
    ['AUDIBLE_NORMAL', ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL],
    ['AUDIBLE_FAST', ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST],
    ['AUDIBLE_FASTEST', ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FASTEST],
    ['DT_FASTEST', ggwave.ProtocolId.GGWAVE_PROTOCOL_DT_FASTEST],
  ];

  // binary payload with all byte values incl. 0x00 and >0x7F
  const bin = new Uint8Array(64).map((_, i) => (i * 37 + 200) & 0xff);

  for (const [name, pid] of protocols) {
    for (const len of [16, 64, 128, 140]) {
      const payload = new Uint8Array(len).map((_, i) => bin[i % 64]);
      let waveform;
      try {
        waveform = ggwave.encode(instance, payload, pid, 10);
      } catch (e) {
        console.log(`${name} len=${len}: encode failed: ${e.message}`);
        continue;
      }
      const secs = waveform.length / sr;
      const decoded = ggwave.decode(instance, waveform);
      const ok = decoded.length === len && payload.every((b, i) => b === (decoded[i] & 0xff));
      console.log(
        `${name.padEnd(16)} len=${String(len).padStart(3)}  airtime=${secs.toFixed(2)}s  ` +
          `eff=${(len / secs).toFixed(1)} B/s  binarySafe=${ok}`
      );
    }
  }
});
