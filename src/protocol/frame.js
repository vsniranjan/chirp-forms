// Wire frame carried by one ggwave transmission (<= 140 B).
//
//   magic(1) | type(1) | msgId(2, BE) | chunk(1: idx<<4 | count-1) | crc8(1) | payload
//
// No length byte: ggwave delivers the exact transmitted length.

export const MAGIC = 0xc7;
export const HEADER_SIZE = 6;
export const MAX_FRAME = 140;
export const MAX_PAYLOAD = MAX_FRAME - HEADER_SIZE;
export const MAX_CHUNKS = 16;

export const MsgType = Object.freeze({
  FORM: 1,
  ENTRIES: 2,
  ACK: 3,
  PING: 4,
  PONG: 5,
  ALERT: 6,
  INFO: 7,
});

const CRC_TABLE = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let b = 0; b < 8; b++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    t[i] = c;
  }
  return t;
})();

export function crc8(bytes, skip = -1) {
  let c = 0;
  for (let i = 0; i < bytes.length; i++) if (i !== skip) c = CRC_TABLE[c ^ bytes[i]];
  return c;
}

export function encodeFrame({ type, msgId, chunkIdx = 0, chunkCount = 1, payload = new Uint8Array(0) }) {
  if (payload.length > MAX_PAYLOAD) throw new RangeError(`payload ${payload.length} > ${MAX_PAYLOAD}`);
  if (chunkCount < 1 || chunkCount > MAX_CHUNKS || chunkIdx < 0 || chunkIdx >= chunkCount) {
    throw new RangeError(`bad chunk ${chunkIdx}/${chunkCount}`);
  }
  const f = new Uint8Array(HEADER_SIZE + payload.length);
  f[0] = MAGIC;
  f[1] = type;
  f[2] = (msgId >> 8) & 0xff;
  f[3] = msgId & 0xff;
  f[4] = (chunkIdx << 4) | (chunkCount - 1);
  f.set(payload, HEADER_SIZE);
  f[5] = crc8(f, 5);
  return f;
}

/** Returns a frame object, or null if the bytes are not a valid frame of ours. */
export function decodeFrame(bytes) {
  if (!bytes || bytes.length < HEADER_SIZE || bytes[0] !== MAGIC) return null;
  if (crc8(bytes, 5) !== bytes[5]) return null;
  const chunkIdx = bytes[4] >> 4;
  const chunkCount = (bytes[4] & 0x0f) + 1;
  if (chunkIdx >= chunkCount) return null;
  return {
    type: bytes[1],
    msgId: (bytes[2] << 8) | bytes[3],
    chunkIdx,
    chunkCount,
    payload: bytes.slice(HEADER_SIZE),
  };
}

export function randomMsgId() {
  return (Math.random() * 0x10000) | 0;
}
