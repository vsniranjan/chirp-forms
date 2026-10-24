import { decodeFrame, encodeFrame, MsgType, randomMsgId } from './frame.js';
import { decodeAck, encodeAck, fullBitmap, missing, Reassembler, split } from './chunker.js';

/**
 * Message layer over a half-duplex radio ({ send(bytes, opts), listen(cb), airtime(bytes, protocol) }).
 * - broadcast(): fire-and-forget to everyone in earshot (forms, alerts), optional repeats.
 * - sendReliable(): chunks, waits for an ACK bitmap, retransmits only missing chunks.
 * - on(type, handler, { ack }): receive complete messages; ack=true makes THIS device the one
 *   that acknowledges (only the supervisor ACKs entries, so nearby workers stay quiet).
 */
export function createLink(radio, { sendOptions = () => ({}), ackDelayMs = 400, maxRounds = 4, onEvent = () => {} } = {}) {
  const reasm = new Reassembler();
  const handlers = new Map();
  const ackWaiters = new Map();
  let txChain = Promise.resolve();

  const transmit = (bytes) => {
    const run = txChain.then(() => radio.send(bytes, sendOptions()));
    txChain = run.catch(() => {});
    return run;
  };

  function onBytes(bytes) {
    const frame = decodeFrame(bytes);
    if (!frame) return onEvent({ kind: 'noise', length: bytes.length });

    if (frame.type === MsgType.ACK) {
      const bitmap = decodeAck(frame.payload);
      onEvent({ kind: 'ack-rx', msgId: frame.msgId, bitmap });
      ackWaiters.get(frame.msgId)?.(bitmap);
      return;
    }

    const res = reasm.push(frame);
    const sub = handlers.get(frame.type);
    onEvent({ kind: 'rx', type: frame.type, msgId: frame.msgId, chunkIdx: frame.chunkIdx, count: frame.chunkCount, ...res });

    if (sub?.ack && (res.status === 'complete' || frame.chunkIdx === frame.chunkCount - 1)) {
      setTimeout(() => {
        onEvent({ kind: 'ack-tx', msgId: frame.msgId, bitmap: res.bitmap });
        transmit(encodeFrame({ type: MsgType.ACK, msgId: frame.msgId, payload: encodeAck(res.bitmap) }));
      }, ackDelayMs);
    }
    if (sub && res.status === 'complete' && !res.duplicate) sub.handler(res.payload, { msgId: frame.msgId, type: frame.type });
  }

  // Register before transmitting so an ACK can't slip past; start the timeout after the last chunk.
  function expectAck(msgId) {
    let resolve;
    const got = new Promise((r) => (resolve = r));
    ackWaiters.set(msgId, resolve);
    return (timeoutMs) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      return got.finally(() => {
        clearTimeout(timer);
        ackWaiters.delete(msgId);
      });
    };
  }

  async function broadcast(type, payload, { repeat = 1, gapMs = 600, msgId = randomMsgId() } = {}) {
    const frames = split(type, msgId, payload);
    for (let r = 0; r < repeat; r++) {
      if (r > 0) await new Promise((res) => setTimeout(res, gapMs));
      for (let i = 0; i < frames.length; i++) {
        onEvent({ kind: 'tx', type, msgId, chunkIdx: i, count: frames.length, round: r });
        await transmit(frames[i]);
      }
    }
    return { msgId, frames: frames.length };
  }

  async function sendReliable(type, payload, { msgId = randomMsgId() } = {}) {
    const frames = split(type, msgId, payload);
    const count = frames.length;
    const ackFrame = encodeFrame({ type: MsgType.ACK, msgId, payload: encodeAck(0) });
    const ackTimeoutMs = ackDelayMs + radio.airtime(ackFrame, sendOptions().protocol) * 1000 + 2500;

    let todo = frames.map((_, i) => i);
    for (let round = 0; round < maxRounds; round++) {
      const waitAck = expectAck(msgId);
      for (const i of todo) {
        onEvent({ kind: 'tx', type, msgId, chunkIdx: i, count, round });
        await transmit(frames[i]);
      }
      const bitmap = await waitAck(ackTimeoutMs);
      if (bitmap === fullBitmap(count)) return { ok: true, msgId, rounds: round + 1 };
      // No ACK heard: resend the last chunk, which makes the receiver reply with what it has.
      todo = bitmap === null ? [count - 1] : missing(bitmap, count);
      onEvent({ kind: 'retry', msgId, round, bitmap, todo });
    }
    return { ok: false, msgId, rounds: maxRounds };
  }

  return {
    start: () => radio.listen(onBytes),
    on(type, handler, { ack = false } = {}) {
      handlers.set(type, { handler, ack });
      return () => handlers.delete(type);
    },
    broadcast,
    sendReliable,
  };
}
