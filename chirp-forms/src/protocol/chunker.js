import { encodeFrame, MAX_CHUNKS, MAX_PAYLOAD } from './frame.js';

/** Splits a message into frames, spreading bytes evenly so no chunk is a tiny tail. */
export function split(type, msgId, payload, maxPayload = MAX_PAYLOAD) {
  const count = Math.max(1, Math.ceil(payload.length / maxPayload));
  if (count > MAX_CHUNKS) throw new RangeError(`message ${payload.length} B needs ${count} chunks (max ${MAX_CHUNKS})`);
  const size = Math.ceil(payload.length / count);
  return Array.from({ length: count }, (_, i) =>
    encodeFrame({ type, msgId, chunkIdx: i, chunkCount: count, payload: payload.subarray(i * size, (i + 1) * size) })
  );
}

export const fullBitmap = (count) => (1 << count) - 1;

/** Indexes of chunks NOT set in a received-bitmap. */
export function missing(bitmap, count) {
  const out = [];
  for (let i = 0; i < count; i++) if (!(bitmap & (1 << i))) out.push(i);
  return out;
}

export function encodeAck(bitmap) {
  return Uint8Array.of((bitmap >> 8) & 0xff, bitmap & 0xff);
}

export function decodeAck(payload) {
  return payload.length >= 2 ? (payload[0] << 8) | payload[1] : 0;
}

/**
 * Collects chunks per (type, msgId). push() returns:
 *   { status: 'partial', bitmap, count } | { status: 'complete', payload, bitmap, count, duplicate }
 * Completed messages are remembered so repeated broadcasts are reported as duplicates.
 */
export class Reassembler {
  constructor({ ttlMs = 5 * 60_000, now = () => Date.now() } = {}) {
    this.pending = new Map();
    this.done = new Map();
    this.ttlMs = ttlMs;
    this.now = now;
  }

  push(frame) {
    this.#expire();
    const key = `${frame.type}:${frame.msgId}`;
    const { chunkCount: count } = frame;
    const finished = this.done.get(key);
    if (finished) return { status: 'complete', payload: finished.payload, bitmap: fullBitmap(count), count, duplicate: true };

    let p = this.pending.get(key);
    if (!p || p.count !== count) {
      p = { count, parts: new Array(count), bitmap: 0, at: this.now() };
      this.pending.set(key, p);
    }
    p.parts[frame.chunkIdx] = frame.payload;
    p.bitmap |= 1 << frame.chunkIdx;
    p.at = this.now();

    if (p.bitmap !== fullBitmap(count)) return { status: 'partial', bitmap: p.bitmap, count };

    const total = p.parts.reduce((n, part) => n + part.length, 0);
    const payload = new Uint8Array(total);
    let off = 0;
    for (const part of p.parts) {
      payload.set(part, off);
      off += part.length;
    }
    this.pending.delete(key);
    this.done.set(key, { payload, at: this.now() });
    return { status: 'complete', payload, bitmap: p.bitmap, count, duplicate: false };
  }

  bitmap(type, msgId) {
    return this.pending.get(`${type}:${msgId}`)?.bitmap ?? 0;
  }

  #expire() {
    const cutoff = this.now() - this.ttlMs;
    for (const m of [this.pending, this.done]) for (const [k, v] of m) if (v.at < cutoff) m.delete(k);
  }
}
