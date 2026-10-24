// Full record snapshots: schema(1), source/id/version(2 each), category/status/flags(1 each),
// optional lat/lon (signed i32, millionths of a degree), then four length-prefixed UTF-8 strings.
export const INFO_CATEGORIES = { places: 'Places', supplies: 'Supplies', contacts: 'Contacts', instructions: 'Instructions' };
export const INFO_STATUSES = { active: 'Active', closed: 'Closed', withdrawn: 'Withdrawn' };
export const INFO_LIMITS = { title: 64, details: 120, phone: 24, hours: 32 };
export const MAX_INFO_BYTES = 268;
const categories = Object.keys(INFO_CATEGORIES);
const statuses = Object.keys(INFO_STATUSES);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export const infoKey = (record) => `${record.sourceId}:${record.id}`;

export function normalizeInfo(input) {
  const record = { ...input };
  for (const field of ['sourceId', 'id', 'version']) {
    if (!Number.isInteger(record[field]) || record[field] < 1 || record[field] > 65535) {
      throw new RangeError(`Invalid record ${field}`);
    }
  }
  if (!categories.includes(record.category)) throw new RangeError('Choose a category');
  if (!statuses.includes(record.status)) throw new RangeError('Choose a status');
  for (const [field, limit] of Object.entries(INFO_LIMITS)) {
    record[field] = String(record[field] ?? '').trim();
    if (encoder.encode(record[field]).length > limit) throw new RangeError(`${field} is too long (maximum ${limit} UTF-8 bytes)`);
  }
  if (!record.title) throw new RangeError('Enter a title');
  if (record.phone && !/^\+?[0-9 ()-]+$/.test(record.phone)) throw new RangeError('Enter a phone number using digits, spaces, +, ( ) or -');
  if (record.phone && record.phone.replace(/\D/g, '').length < 3) throw new RangeError('Phone number needs at least three digits');
  const hasLat = record.lat !== null && record.lat !== undefined;
  const hasLon = record.lon !== null && record.lon !== undefined;
  if (hasLat !== hasLon) throw new RangeError('Enter both latitude and longitude');
  if (hasLat) {
    if (!Number.isFinite(record.lat) || record.lat < -90 || record.lat > 90) throw new RangeError('Latitude must be between -90 and 90');
    if (!Number.isFinite(record.lon) || record.lon < -180 || record.lon > 180) throw new RangeError('Longitude must be between -180 and 180');
    record.lat = Math.round(record.lat * 1e6) / 1e6;
    record.lon = Math.round(record.lon * 1e6) / 1e6;
  } else {
    record.lat = record.lon = null;
  }
  return record;
}

export function encodeInfo(input) {
  const record = normalizeInfo(input);
  const bytes = new Uint8Array(MAX_INFO_BYTES);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  bytes[offset++] = 1;
  for (const field of ['sourceId', 'id', 'version']) {
    view.setUint16(offset, record[field]);
    offset += 2;
  }
  bytes[offset++] = categories.indexOf(record.category);
  bytes[offset++] = statuses.indexOf(record.status);
  bytes[offset++] = record.lat === null ? 0 : 1;
  if (record.lat !== null) {
    view.setInt32(offset, Math.round(record.lat * 1e6));
    view.setInt32(offset + 4, Math.round(record.lon * 1e6));
    offset += 8;
  }
  for (const field of Object.keys(INFO_LIMITS)) {
    const text = encoder.encode(record[field]);
    if (offset + 1 + text.length > bytes.length) throw new RangeError('Keep this card shorter for broadcasting');
    bytes[offset++] = text.length;
    bytes.set(text, offset);
    offset += text.length;
  }
  return bytes.slice(0, offset);
}

export function decodeInfo(bytes) {
  if (bytes.length < 14 || bytes.length > MAX_INFO_BYTES || bytes[0] !== 1) throw new RangeError('Unsupported or incomplete information card');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const record = {
    sourceId: view.getUint16(1), id: view.getUint16(3), version: view.getUint16(5),
    category: categories[bytes[7]], status: statuses[bytes[8]], lat: null, lon: null,
  };
  if (bytes[9] > 1) throw new RangeError('Unknown information card flags');
  let offset = 10;
  if (bytes[9]) {
    if (bytes.length < 22) throw new RangeError('Incomplete coordinates');
    record.lat = view.getInt32(offset) / 1e6;
    record.lon = view.getInt32(offset + 4) / 1e6;
    offset += 8;
  }
  for (const field of Object.keys(INFO_LIMITS)) {
    if (offset >= bytes.length) throw new RangeError('Incomplete information card');
    const length = bytes[offset++];
    if (offset + length > bytes.length) throw new RangeError('Incomplete information card');
    record[field] = decoder.decode(bytes.subarray(offset, offset + length));
    offset += length;
  }
  if (offset !== bytes.length) throw new RangeError('Unexpected information card data');
  return normalizeInfo(record);
}

// Revisions, rather than arrival times, prevent a replay from reopening a closed service.
export function mergeInfo(records, incoming, receivedAt = Date.now()) {
  const record = normalizeInfo(incoming);
  const key = infoKey(record);
  const previous = records[key];
  if (previous && previous.version >= record.version) return { changed: false, records };
  return { changed: true, added: !previous, records: { ...records, [key]: { ...record, receivedAt } } };
}

export function findInfo(records, query = '', category = '') {
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return Object.values(records)
    .filter((record) => !category || record.category === category)
    .filter((record) => {
      const text = [record.title, record.details, record.phone, record.hours, INFO_CATEGORIES[record.category], INFO_STATUSES[record.status]].join(' ').normalize('NFKC').toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => (b.receivedAt ?? 0) - (a.receivedAt ?? 0) || a.title.localeCompare(b.title));
}
