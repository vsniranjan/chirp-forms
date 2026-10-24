import { describe, expect, it } from 'vitest';
import { decodeInfo, encodeInfo, findInfo, infoKey, MAX_INFO_BYTES, mergeInfo } from './info.js';

const card = (patch = {}) => ({
  sourceId: 42, id: 1, version: 1, category: 'supplies', status: 'active',
  title: 'Water point — North gate', details: 'Bring 2 empty containers.', hours: '4:30–5:00 PM', phone: '+91 12345 67890',
  lat: 9.9816, lon: 76.2999, ...patch,
});

describe('information records', () => {
  it('round trips a complete card, including coordinates, phone, hours and Unicode', () => {
    const record = card();
    const bytes = encodeInfo(record);
    expect(bytes.length).toBeLessThanOrEqual(MAX_INFO_BYTES);
    expect(decodeInfo(bytes)).toEqual(record);
  });

  it('supports all categories and statuses and optional blank fields', () => {
    for (const category of ['places', 'supplies', 'contacts', 'instructions']) {
      for (const status of ['active', 'closed', 'withdrawn']) {
        const record = card({ category, status, lat: null, lon: null, phone: '', hours: '', details: '' });
        expect(decodeInfo(encodeInfo(record))).toEqual(record);
      }
    }
  });

  it('keeps full cards within two frames even with maximum text sizes', () => {
    const record = card({ title: 't'.repeat(64), details: 'd'.repeat(120), hours: 'h'.repeat(32), phone: '1'.repeat(24) });
    expect(encodeInfo(record).length).toBeLessThanOrEqual(MAX_INFO_BYTES);
  });

  it('rejects invalid input, invalid identities and text that exceeds the byte budget', () => {
    for (const patch of [
      { title: '' }, { title: 'അ'.repeat(30) }, { details: 'x'.repeat(121) }, { lat: 91 }, { lon: -181 },
      { lat: NaN }, { lon: null }, { category: 'unknown' }, { status: 'unknown' },
      { phone: 'javascript:alert(1)' }, { version: 65536 }, { version: 0 }, { id: 1.5 },
    ]) expect(() => encodeInfo(card(patch))).toThrow();
  });

  it('rejects truncated, unknown and trailing wire data', () => {
    const bytes = encodeInfo(card());
    for (let length = 0; length < bytes.length; length++) expect(() => decodeInfo(bytes.slice(0, length))).toThrow();
    const unknown = bytes.slice();
    unknown[0] = 2;
    expect(() => decodeInfo(unknown)).toThrow();
    const flags = bytes.slice();
    flags[9] = 2;
    expect(() => decodeInfo(flags)).toThrow();
    expect(() => decodeInfo(Uint8Array.from([...bytes, 1]))).toThrow();
  });

  it('upserts newer snapshots and ignores repeats and old replays, including after reload', () => {
    let records = mergeInfo({}, card(), 100).records;
    const closed = card({ version: 3, status: 'closed', hours: 'Closed today' });
    records = mergeInfo(records, closed, 200).records;
    records = JSON.parse(JSON.stringify(records));
    expect(mergeInfo(records, card(), 300).changed).toBe(false);
    expect(mergeInfo(records, closed, 400).changed).toBe(false);
    expect(Object.keys(records)).toHaveLength(1);
    expect(records[infoKey(closed)]).toMatchObject({ version: 3, status: 'closed', hours: 'Closed today', receivedAt: 200 });
  });

  it('accepts a snapshot without earlier revisions and keeps distinct records separate', () => {
    let records = mergeInfo({}, card({ version: 9 })).records;
    records = mergeInfo(records, card({ id: 2 })).records;
    records = mergeInfo(records, card({ sourceId: 43 })).records;
    expect(Object.keys(records)).toHaveLength(3);
  });

  it('searches text, phone, hours, category and status without hiding closed cards', () => {
    let records = mergeInfo({}, card({ status: 'closed' })).records;
    records = mergeInfo(records, card({ id: 2, category: 'places', title: 'Shelter', details: '', hours: '', phone: '' })).records;
    expect(findInfo(records, ' WATER closed ', 'supplies')).toHaveLength(1);
    expect(findInfo(records, '12345')).toHaveLength(1);
    expect(findInfo(records, 'shelter', 'supplies')).toHaveLength(0);
    expect(findInfo(records, '', 'places')).toHaveLength(1);
  });
});
