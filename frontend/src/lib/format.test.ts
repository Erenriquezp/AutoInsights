import { describe, expect, it } from 'vitest';
import { brandName, formatters, modelName, vehicleName } from './format';

describe('numbers', () => {
  it('groups thousands per language', () => {
    expect(formatters('en').number(354649)).toBe('354,649');
    expect(formatters('es').number(354649)).toBe('354.649');
  });

  it('groups four-digit numbers in Spanish too', () => {
    expect(formatters('es').number(9514)).toBe('9.514');
  });

  it('formats US dollars without cents', () => {
    expect(formatters('en').money(19411.12)).toBe('$19,411');
    expect(formatters('es').money(19411.12)).toMatch(/^19\.411\s\$$/);
  });

  it('formats compact amounts', () => {
    expect(formatters('en').compactMoney(25_000)).toBe('$25K');
  });

  it('signs percentages with a true minus sign', () => {
    const f = formatters('en');
    expect(f.signedPercent(-47.8)).toBe('−47.8 %');
    expect(f.signedPercent(3.25)).toBe('+3.3 %');
    expect(f.signedPercent(0)).toBe('0.0 %');
    expect(formatters('es').percent(38.03)).toBe('38,0 %');
  });
});

describe('names', () => {
  it.each([
    ['ford', 'Ford'],
    ['bmw', 'BMW'],
    ['mercedes-benz', 'Mercedes-Benz'],
    ['land rover', 'Land Rover'],
    ['alfa-romeo', 'Alfa Romeo'],
  ])('brand %s -> %s', (raw, shown) => {
    expect(brandName(raw)).toBe(shown);
  });

  it.each([
    ['f-150', 'F-150'],
    ['cr-v', 'CR-V'],
    ['c-hr', 'C-HR'],
    ['cx-5 touring', 'CX-5 Touring'],
    ['c-max hybrid', 'C-Max Hybrid'],
    ['e-series cargo', 'E-Series Cargo'],
    ['rav4', 'RAV4'],
    ['4runner', '4Runner'],
    ['328i', '328i'],
    ['camry', 'Camry'],
    ['mazda3', 'Mazda3'],
    ['grand cherokee', 'Grand Cherokee'],
  ])('model %s -> %s', (raw, shown) => {
    expect(modelName(raw)).toBe(shown);
  });

  it('joins brand and model', () => {
    expect(vehicleName('ford', 'f-150')).toBe('Ford F-150');
  });
});
