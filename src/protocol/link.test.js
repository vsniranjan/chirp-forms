import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLink } from './link.js';
import { decodeFrame, MsgType } from './frame.js';

// Shared "air": a send is heard by every other listening radio after its airtime, unless drop() says no.
function createAir(drop = () => false) {
  const radios = [];
  return (name) => {
    const r = {
      name,
      cb: null,
      sent: [],
      listen(cb) {
        r.cb = cb;
      },
      airtime: (bytes) => 0.5 + bytes.length * 0.1,
      send(bytes) {
        r.sent.push(decodeFrame(bytes));
        return new Promise((res) =>
          setTimeout(() => {
            for (const o of radios) if (o !== r && o.cb && !drop(decodeFrame(bytes), r, o)) o.cb(Uint8Array.from(bytes));
            res();
          }, r.airtime(bytes) * 1000)
        );
      },
    };
    radios.push(r);
    return r;
  };
}

const payload = (n) => Uint8Array.from({ length: n }, (_, i) => (i * 13 + 1) & 0xff);

async function run(promise) {
  await vi.runAllTimersAsync();
  return promise;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('link', () => {
  it('broadcast reaches every listener once, even when repeated', async () => {
    const air = createAir();
    const sup = createLink(air('sup'));
    const got = { a: [], b: [] };
    for (const k of ['a', 'b']) {
      const l = createLink(air(k));
      l.on(MsgType.FORM, (p) => got[k].push(p));
      l.start();
    }
    await run(sup.broadcast(MsgType.FORM, payload(13), { repeat: 2 }));
    expect(got.a).toEqual([payload(13)]);
    expect(got.b).toEqual([payload(13)]);
  });

  it('reliable send completes in one round with a single ACK from the supervisor only', async () => {
    const air = createAir();
    const supRadio = air('sup');
    const sup = createLink(supRadio);
    const received = [];
    sup.on(MsgType.ENTRIES, (p) => received.push(p), { ack: true });
    sup.start();
    const bystander = air('other');
    createLink(bystander).start();
    const worker = createLink(air('worker'));
    worker.start();

    const res = await run(worker.sendReliable(MsgType.ENTRIES, payload(300)));
    expect(res).toMatchObject({ ok: true, rounds: 1 });
    expect(received).toEqual([payload(300)]);
    expect(supRadio.sent.filter((f) => f.type === MsgType.ACK)).toHaveLength(1);
    expect(bystander.sent).toHaveLength(0);
  });

  it('retransmits only the chunk that was lost', async () => {
    let dropped = false;
    const air = createAir((f) => {
      if (f.type === MsgType.ENTRIES && f.chunkIdx === 1 && !dropped) return (dropped = true);
      return false;
    });
    const sup = createLink(air('sup'));
    const received = [];
    sup.on(MsgType.ENTRIES, (p) => received.push(p), { ack: true });
    sup.start();
    const workerRadio = air('worker');
    const worker = createLink(workerRadio);
    worker.start();

    const res = await run(worker.sendReliable(MsgType.ENTRIES, payload(300)));
    expect(res).toMatchObject({ ok: true, rounds: 2 });
    expect(workerRadio.sent.map((f) => f.chunkIdx)).toEqual([0, 1, 2, 1]);
    expect(received).toEqual([payload(300)]);
  });

  it('recovers from a lost ACK without delivering the message twice', async () => {
    let dropped = false;
    const air = createAir((f) => {
      if (f.type === MsgType.ACK && !dropped) return (dropped = true);
      return false;
    });
    const sup = createLink(air('sup'));
    const received = [];
    sup.on(MsgType.ENTRIES, (p) => received.push(p), { ack: true });
    sup.start();
    const worker = createLink(air('worker'));
    worker.start();

    const res = await run(worker.sendReliable(MsgType.ENTRIES, payload(40)));
    expect(res).toMatchObject({ ok: true, rounds: 2 });
    expect(received).toHaveLength(1);
  });

  it('gives up after maxRounds when nobody answers', async () => {
    const air = createAir();
    const workerRadio = air('worker');
    const worker = createLink(workerRadio, { maxRounds: 3 });
    worker.start();
    const res = await run(worker.sendReliable(MsgType.ENTRIES, payload(200)));
    expect(res).toMatchObject({ ok: false, rounds: 3 });
    expect(workerRadio.sent.map((f) => f.chunkIdx)).toEqual([0, 1, 1, 1]);
  });

  it('ignores bytes that are not our frames', async () => {
    const events = [];
    const radio = { listen: (cb) => (radio.cb = cb), send: async () => {}, airtime: () => 1 };
    const l = createLink(radio, { onEvent: (e) => events.push(e) });
    const got = [];
    l.on(MsgType.FORM, (p) => got.push(p));
    l.start();
    radio.cb(new TextEncoder().encode('hello from another ggwave app'));
    expect(got).toHaveLength(0);
    expect(events[0].kind).toBe('noise');
  });
});
