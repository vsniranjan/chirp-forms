import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame, HEADER_SIZE, MAX_PAYLOAD, MsgType } from './frame.js';

describe('frame', () => {
  it('round-trips header and binary payload', () => {
    const payload = Uint8Array.from({ length: MAX_PAYLOAD }, (_, i) => (i * 53) & 0xff);
    const bytes = encodeFrame({ type: MsgType.ENTRIES, msgId: 0xbeef, chunkIdx: 15, chunkCount: 16, payload });
    expect(bytes.length).toBe(HEADER_SIZE + MAX_PAYLOAD);
    expect(decodeFrame(bytes)).toEqual({ type: MsgType.ENTRIES, msgId: 0xbeef, chunkIdx: 15, chunkCount: 16, payload });
  });

  it('accepts an empty payload', () => {
    const f = decodeFrame(encodeFrame({ type: MsgType.PING, msgId: 1 }));
    expect(f.payload.length).toBe(0);
    expect(f.chunkCount).toBe(1);
  });

  it('rejects corrupted bytes, wrong magic and short input', () => {
    const good = encodeFrame({ type: MsgType.FORM, msgId: 7, payload: Uint8Array.of(1, 2, 3) });
    for (let i = 0; i < good.length; i++) {
      const bad = good.slice();
      bad[i] ^= 0x10;
      expect(decodeFrame(bad)).toBeNull();
    }
    expect(decodeFrame(new TextEncoder().encode('hello'))).toBeNull();
    expect(decodeFrame(Uint8Array.of(0xc7, 1))).toBeNull();
  });

  it('refuses oversized payloads and bad chunk numbers', () => {
    expect(() => encodeFrame({ type: 1, msgId: 1, payload: new Uint8Array(MAX_PAYLOAD + 1) })).toThrow();
    expect(() => encodeFrame({ type: 1, msgId: 1, chunkIdx: 2, chunkCount: 2 })).toThrow();
    expect(() => encodeFrame({ type: 1, msgId: 1, chunkCount: 17 })).toThrow();
  });
});
