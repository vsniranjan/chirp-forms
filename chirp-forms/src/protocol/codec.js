import { LABELS, LABEL_INDEX } from '../presets.js';

// Compact binary encodings for forms and entries. Every byte is ~0.15-0.4 s of airtime.
//
// Label:  dictIdx(1)  |  0xFF len(1) utf8(len<=MAX_LITERAL)
// Form:   formId(1) title:Label field*            (fields run to end of buffer)
// Field:  type(3b)<<5 | code(5b)  [Label if code==31]  [optCount(1) Label*  if choice]
// Entries: formId(1) deviceId(2, BE) entry*       (entries run to end of buffer)
// Entry:  seq(1) value*  (one per form field, in order)
//   number: varint(zigzag(n)+1), 0 = blank     yesno: 0 blank, 1 no, 2 yes
//   choice: 0 blank, i+1                         text: len(1) utf8

export const FieldType = Object.freeze({ text: 0, number: 1, yesno: 2, choice: 3 });
const TYPE_NAMES = Object.keys(FieldType);
const LITERAL = 0xff;
const FIELD_LITERAL = 31;
export const MAX_LITERAL = 24;
export const MAX_TEXT = 120;
export const MAX_OPTIONS = 8;

const enc = new TextEncoder();
const dec = new TextDecoder();

class Writer {
  constructor() {
    this.bytes = [];
  }
  u8(v) {
    this.bytes.push(v & 0xff);
  }
  u16(v) {
    this.u8(v >> 8);
    this.u8(v);
  }
  varint(v) {
    do {
      let b = v & 0x7f;
      v = Math.floor(v / 128);
      if (v > 0) b |= 0x80;
      this.u8(b);
    } while (v > 0);
  }
  str(s, max) {
    const b = enc.encode(s);
    if (b.length > max) throw new RangeError(`"${s}" is ${b.length} B, max ${max}`);
    this.u8(b.length);
    this.bytes.push(...b);
  }
  label(s) {
    const idx = LABEL_INDEX.get(s.toLowerCase());
    if (idx !== undefined && idx < LITERAL) return this.u8(idx);
    this.u8(LITERAL);
    this.str(s, MAX_LITERAL);
  }
  done() {
    return Uint8Array.from(this.bytes);
  }
}

class Reader {
  constructor(bytes) {
    this.b = bytes;
    this.i = 0;
  }
  get more() {
    return this.i < this.b.length;
  }
  u8() {
    if (this.i >= this.b.length) throw new RangeError('truncated');
    return this.b[this.i++];
  }
  u16() {
    return (this.u8() << 8) | this.u8();
  }
  varint() {
    let v = 0;
    for (let shift = 1; ; shift *= 128) {
      const b = this.u8();
      v += (b & 0x7f) * shift;
      if (!(b & 0x80)) return v;
    }
  }
  str() {
    const n = this.u8();
    if (this.i + n > this.b.length) throw new RangeError('truncated');
    const s = dec.decode(this.b.subarray(this.i, this.i + n));
    this.i += n;
    return s;
  }
  label(first = this.u8()) {
    if (first !== LITERAL) {
      if (first >= LABELS.length) throw new RangeError(`unknown label ${first}`);
      return LABELS[first];
    }
    return this.str();
  }
}

const zigzag = (n) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzigzag = (z) => (z % 2 === 0 ? z / 2 : -(z + 1) / 2);

export function encodeForm(form) {
  const w = new Writer();
  w.u8(form.id);
  w.label(form.title);
  for (const f of form.fields) {
    const type = FieldType[f.type];
    if (type === undefined) throw new TypeError(`unknown field type ${f.type}`);
    const idx = LABEL_INDEX.get(f.label.toLowerCase());
    if (idx !== undefined && idx < FIELD_LITERAL) {
      w.u8((type << 5) | idx);
    } else {
      w.u8((type << 5) | FIELD_LITERAL);
      w.label(f.label);
    }
    if (f.type === 'choice') {
      if (!f.options?.length || f.options.length > MAX_OPTIONS) throw new RangeError('choice needs 1-8 options');
      w.u8(f.options.length);
      f.options.forEach((o) => w.label(o));
    }
  }
  return w.done();
}

export function decodeForm(bytes) {
  const r = new Reader(bytes);
  const form = { id: r.u8(), title: r.label(), fields: [] };
  while (r.more) {
    const b = r.u8();
    const type = TYPE_NAMES[b >> 5];
    if (!type) throw new RangeError(`unknown field type ${b >> 5}`);
    const code = b & 0x1f;
    const field = { type, label: code === FIELD_LITERAL ? r.label() : r.label(code) };
    if (type === 'choice') {
      const n = r.u8();
      field.options = Array.from({ length: n }, () => r.label());
    }
    form.fields.push(field);
  }
  return form;
}

function writeValue(w, field, v) {
  const blank = v === null || v === undefined || v === '';
  switch (field.type) {
    case 'number':
      return w.varint(blank ? 0 : zigzag(Math.round(Number(v))) + 1);
    case 'yesno':
      return w.u8(blank ? 0 : v ? 2 : 1);
    case 'choice': {
      const i = blank ? -1 : field.options.indexOf(v);
      return w.u8(i + 1);
    }
    case 'text':
      return w.str(blank ? '' : String(v), MAX_TEXT);
  }
}

function readValue(r, field) {
  switch (field.type) {
    case 'number': {
      const z = r.varint();
      return z === 0 ? null : unzigzag(z - 1);
    }
    case 'yesno': {
      const b = r.u8();
      return b === 0 ? null : b === 2;
    }
    case 'choice': {
      const b = r.u8();
      return b === 0 ? null : (field.options[b - 1] ?? null);
    }
    case 'text': {
      const s = r.str();
      return s === '' ? null : s;
    }
  }
}

export function encodeEntries(form, deviceId, entries) {
  const w = new Writer();
  w.u8(form.id);
  w.u16(deviceId);
  for (const e of entries) {
    w.u8(e.seq);
    form.fields.forEach((f, i) => writeValue(w, f, e.values[i]));
  }
  return w.done();
}

/** Header only, so the receiver can find the matching form before decoding values. */
export function peekEntries(bytes) {
  const r = new Reader(bytes);
  return { formId: r.u8(), deviceId: r.u16() };
}

export function decodeEntries(form, bytes) {
  const r = new Reader(bytes);
  const formId = r.u8();
  if (formId !== form.id) throw new RangeError(`entries for form ${formId}, not ${form.id}`);
  const deviceId = r.u16();
  const entries = [];
  while (r.more) {
    const seq = r.u8();
    entries.push({ seq, values: form.fields.map((f) => readValue(r, f)) });
  }
  return { formId, deviceId, entries };
}
