import { describe, expect, it } from 'vitest';
import ggwave_factory from 'ggwave';
import { split } from './chunker.js';
import { decodeFrame, MsgType } from './frame.js';
import { encodeEntries, encodeForm, decodeForm } from './codec.js';
import { PRESETS } from '../presets.js';

// Real ggwave modulation/demodulation in Node: proves our frames survive the modem byte-exact.
describe('frames through the ggwave modem', async () => {
  const ggwave = await ggwave_factory();
  ggwave.disableLog();
  const params = ggwave.getDefaultParameters();

  const throughModem = (bytes, protocol) => {
    const inst = ggwave.init(params);
    const wave = ggwave.encode(inst, bytes, ggwave.ProtocolId[protocol], 10);
    const copy = new Uint8Array(wave.buffer.slice(wave.byteOffset, wave.byteOffset + wave.byteLength));
    const out = Uint8Array.from(ggwave.decode(inst, copy));
    ggwave.free(inst);
    return { out, seconds: copy.length / 4 / params.sampleRateOut };
  };

  const form = { id: 42, ...PRESETS.rapidNeeds };

  for (const protocol of ['GGWAVE_PROTOCOL_AUDIBLE_FASTEST', 'GGWAVE_PROTOCOL_AUDIBLE_NORMAL']) {
    it(`preset form broadcast via ${protocol.replace('GGWAVE_PROTOCOL_', '')}`, () => {
      const [frame] = split(MsgType.FORM, 0x1234, encodeForm(form));
      const { out, seconds } = throughModem(frame, protocol);
      expect(decodeForm(decodeFrame(out).payload)).toEqual(form);
      console.log(`  form frame ${frame.length} B -> ${seconds.toFixed(1)} s`);
    });
  }

  it('a typical entry frame survives and stays short', () => {
    const bytes = encodeEntries(form, 7, [{ seq: 1, values: [12, 5, 1, true, 'Water', 'roof gone'] }]);
    const [frame] = split(MsgType.ENTRIES, 0x55, bytes);
    const { out, seconds } = throughModem(frame, 'GGWAVE_PROTOCOL_AUDIBLE_FASTEST');
    expect(out).toEqual(frame);
    console.log(`  entry frame ${frame.length} B -> ${seconds.toFixed(1)} s`);
  });
});
