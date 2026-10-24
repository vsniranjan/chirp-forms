import { describe, expect, it } from 'vitest';
import { LABELS } from './presets.js';
import { missingLabels, tl, uiKeys } from './i18n.js';

describe('i18n', () => {
  it('translates every dictionary label in every language', () => {
    for (const [lang, missing] of Object.entries(missingLabels(LABELS))) expect(missing, lang).toEqual([]);
  });

  it('has the same UI strings in every language', () => {
    const keys = uiKeys();
    for (const lang of Object.keys(keys)) expect(keys[lang].sort(), lang).toEqual(keys.en.sort());
  });

  it('falls back to the label for custom labels and English', () => {
    expect(tl('Water', 'ml')).toBe('വെള്ളം');
    expect(tl('Boat no', 'ml')).toBe('Boat no');
    expect(tl('Water', 'en')).toBe('Water');
  });
});
