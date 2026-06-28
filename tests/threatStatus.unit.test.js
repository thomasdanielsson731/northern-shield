import { describe, it, expect } from 'vitest';
import {
  primaryWaveThreatLabel,
  formatThreatStatusLine,
} from '../src/combat/threatStatus.js';

describe('threatStatus', () => {
  it('picks primary threat label from composition', () => {
    expect(primaryWaveThreatLabel({ draugr: 10, mylings: 0 })).toBe('Draugr');
    expect(primaryWaveThreatLabel({ draugr: 5, mylings: 5 })).toBe('mixed host');
    expect(primaryWaveThreatLabel({})).toBe('enemies');
  });

  it('formats unified threat line', () => {
    expect(formatThreatStatusLine({
      onField: 8,
      incoming: 2,
      waveTotal: 10,
      comp: { draugr: 10 },
    })).toBe('8/10 Draugr · 2 incoming');

    expect(formatThreatStatusLine({
      onField: 3,
      incoming: 0,
      waveTotal: 10,
      comp: { draugr: 10 },
    })).toBe('3/10 Draugr');

    expect(formatThreatStatusLine({
      onField: 4,
      incoming: 1,
      waveTotal: 5,
      campaign: true,
    })).toBe('5 remaining · 1 incoming');
  });
});
