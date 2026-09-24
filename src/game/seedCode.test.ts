import { describe, expect, it } from 'vitest';
import { randomSeed } from './rng';
import { formatSeed, parseSeed } from './seedCode';

describe('formatSeed / parseSeed', () => {
  it.each([0, 1, 35, 36, 12_345, 20_260_924, 0x7fffffff, 0xffffffff])(
    'round-trips seed %d',
    (seed) => {
      expect(parseSeed(formatSeed(seed))).toBe(seed);
    },
  );

  it('round-trips random seeds as short upper-case codes', () => {
    for (let i = 0; i < 500; i++) {
      const seed = randomSeed();
      const code = formatSeed(seed);
      expect(code).toMatch(/^[0-9A-Z]{1,7}$/);
      expect(parseSeed(code)).toBe(seed);
    }
  });

  it('formats the largest seed as 1Z141Z3', () => {
    expect(formatSeed(0xffffffff)).toBe('1Z141Z3');
  });

  it('treats seeds as unsigned 32-bit integers', () => {
    expect(formatSeed(-1)).toBe(formatSeed(0xffffffff));
  });

  it('accepts lower case, spaces and a leading #', () => {
    const code = formatSeed(987_654_321);
    expect(parseSeed(code.toLowerCase())).toBe(987_654_321);
    expect(parseSeed(`  #${code.slice(0, 3)} ${code.slice(3)}  `)).toBe(987_654_321);
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['a lone #', '#'],
    ['punctuation', 'AB-12'],
    ['non-ASCII letters', 'ÉTÉ'],
    ['more than 7 characters', '12345678'],
    ['a code past the largest seed', '1Z141Z4'],
    ['the largest 7-character code', 'ZZZZZZZ'],
    ['a number with a sign', '-5'],
    ['a decimal', '1.5'],
  ])('rejects %s', (_, text) => {
    expect(parseSeed(text)).toBeNull();
  });
});
