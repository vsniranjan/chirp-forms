import { describe, expect, it } from 'vitest';
import { decodeEntries, decodeForm, encodeEntries, encodeForm, peekEntries } from './codec.js';
import { PRESETS } from '../presets.js';

const preset = { id: 42, ...PRESETS.rapidNeeds };

describe('form codec', () => {
  it('round-trips the preset form in very few bytes', () => {
    const bytes = encodeForm(preset);
    expect(decodeForm(bytes)).toEqual(preset);
    // id + title + 6 field bytes + choice(count + 4 options) = 13
    expect(bytes.length).toBe(13);
  });

  it('round-trips literal labels and options not in the dictionary', () => {
    const form = {
      id: 1,
      title: 'Boat crew',
      fields: [
        { type: 'text', label: 'Boat no' },
        { type: 'choice', label: 'Priority', options: ['Low', 'Fuel'] },
        { type: 'yesno', label: 'Roll call' },
      ],
    };
    expect(decodeForm(encodeForm(form))).toEqual(form);
  });

  it('matches dictionary labels case-insensitively and returns the canonical label', () => {
    const form = { id: 3, title: 'rapid needs', fields: [{ type: 'number', label: 'PEOPLE' }] };
    expect(encodeForm(form).length).toBe(3);
    expect(decodeForm(encodeForm(form)).fields[0].label).toBe('People');
  });

  it('rejects over-long literals and bad choice fields', () => {
    expect(() => encodeForm({ id: 1, title: 'x'.repeat(25), fields: [] })).toThrow();
    expect(() => encodeForm({ id: 1, title: 'Notes', fields: [{ type: 'choice', label: 'Food', options: [] }] })).toThrow();
  });
});

describe('entries codec', () => {
  const entries = [
    { seq: 1, values: [12, 5, 0, true, 'Medical', 'roof collapsed'] },
    { seq: 2, values: [13, 300, -1, false, null, null] },
    { seq: 3, values: [null, null, null, null, null, 'നമസ്കാരം 你好'] },
  ];

  it('round-trips values including blanks, negatives and unicode', () => {
    const bytes = encodeEntries(preset, 0xa1b2, entries);
    expect(peekEntries(bytes)).toEqual({ formId: 42, deviceId: 0xa1b2 });
    expect(decodeEntries(preset, bytes)).toEqual({ formId: 42, deviceId: 0xa1b2, entries });
  });

  it('keeps a typical single entry well under the 25 B budget', () => {
    const bytes = encodeEntries(preset, 7, [{ seq: 1, values: [12, 5, 1, true, 'Water', 'ok'] }]);
    expect(bytes.length).toBeLessThanOrEqual(16);
  });

  it('refuses entries decoded against the wrong form', () => {
    const bytes = encodeEntries(preset, 7, entries.slice(0, 1));
    expect(() => decodeEntries({ ...preset, id: 9 }, bytes)).toThrow();
  });

  it('throws on truncated input instead of returning garbage', () => {
    const bytes = encodeEntries(preset, 7, entries.slice(0, 1));
    expect(() => decodeEntries(preset, bytes.slice(0, -2))).toThrow();
  });
});
