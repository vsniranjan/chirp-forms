import { describe, expect, it } from 'vitest';
import { decodeAck, encodeAck, fullBitmap, missing, Reassembler, split } from './chunker.js';
import { decodeFrame, MAX_PAYLOAD, MsgType } from './frame.js';

const bytes = (n) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 0xff);

describe('split', () => {
  it('keeps small messages in one frame', () => {
    const frames = split(MsgType.FORM, 1, bytes(13));
    expect(frames).toHaveLength(1);
    expect(decodeFrame(frames[0]).payload).toEqual(bytes(13));
  });

  it('spreads large messages evenly across frames', () => {
    const frames = split(MsgType.ENTRIES, 2, bytes(300)).map(decodeFrame);
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload.length)).toEqual([100, 100, 100]);
    expect(frames.every((f) => f.payload.length <= MAX_PAYLOAD)).toBe(true);
  });

  it('refuses messages that need more than 16 chunks', () => {
    expect(() => split(MsgType.ENTRIES, 3, bytes(MAX_PAYLOAD * 16 + 1))).toThrow();
  });
});

describe('Reassembler', () => {
  it('reassembles out-of-order chunks and reports progress', () => {
    const r = new Reassembler();
    const frames = split(MsgType.ENTRIES, 9, bytes(300)).map(decodeFrame);
    expect(r.push(frames[2])).toMatchObject({ status: 'partial', bitmap: 0b100 });
    expect(r.push(frames[0])).toMatchObject({ status: 'partial', bitmap: 0b101 });
    expect(missing(r.bitmap(MsgType.ENTRIES, 9), 3)).toEqual([1]);
    const res = r.push(frames[1]);
    expect(res.status).toBe('complete');
    expect(res.duplicate).toBe(false);
    expect(res.payload).toEqual(bytes(300));
  });

  it('flags repeated broadcasts as duplicates', () => {
    const r = new Reassembler();
    const [f] = split(MsgType.FORM, 5, bytes(10)).map(decodeFrame);
    expect(r.push(f).duplicate).toBe(false);
    expect(r.push(f).duplicate).toBe(true);
  });

  it('keeps messages with different ids or types apart', () => {
    const r = new Reassembler();
    const a = split(MsgType.ENTRIES, 1, bytes(200)).map(decodeFrame);
    const b = split(MsgType.ENTRIES, 2, bytes(200)).map(decodeFrame);
    r.push(a[0]);
    r.push(b[1]);
    expect(r.push(a[1]).payload).toEqual(bytes(200));
    expect(r.push(b[0]).payload).toEqual(bytes(200));
  });

  it('forgets stale partial messages', () => {
    let t = 0;
    const r = new Reassembler({ ttlMs: 1000, now: () => t });
    const frames = split(MsgType.ENTRIES, 4, bytes(200)).map(decodeFrame);
    r.push(frames[0]);
    t = 5000;
    expect(r.push(frames[1])).toMatchObject({ status: 'partial', bitmap: 0b10 });
  });
});

describe('ack bitmap', () => {
  it('round-trips and lists missing chunks', () => {
    expect(decodeAck(encodeAck(0b1011_0000_0000_0101))).toBe(0b1011_0000_0000_0101);
    expect(missing(0b0101, 4)).toEqual([1, 3]);
    expect(missing(fullBitmap(16), 16)).toEqual([]);
  });
});
