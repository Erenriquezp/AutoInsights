// Display formatting. Data values arrive lowercase ("ford", "f-150"); numbers are formatted
// with the viewer's language. Pure functions, unit-tested in format.test.ts.

export type Lang = 'en' | 'es';

const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-ES' };

export interface Formatters {
  number: (value: number) => string;
  money: (value: number) => string;
  compactMoney: (value: number) => string;
  percent: (value: number, digits?: number) => string;
  signedPercent: (value: number) => string;
}

export function formatters(lang: Lang): Formatters {
  const locale = LOCALES[lang];
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: true });
  const usd = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    // es-ES writes "19.411 US$" by default; "$" reads better for a US dataset
    currencyDisplay: 'narrowSymbol',
  });
  const compact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 0,
    currencyDisplay: 'narrowSymbol',
  });
  const percentWith = (digits: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });

  return {
    number: (value) => integer.format(value),
    money: (value) => usd.format(value),
    compactMoney: (value) => compact.format(value),
    percent: (value, digits = 1) => `${percentWith(digits).format(value)} %`,
    signedPercent: (value) => {
      const text = `${percentWith(1).format(Math.abs(value))} %`;
      return value < 0 ? `−${text}` : value > 0 ? `+${text}` : text;
    },
  };
}

const BRAND_NAMES: Record<string, string> = {
  bmw: 'BMW',
  gmc: 'GMC',
  mini: 'MINI',
  'alfa-romeo': 'Alfa Romeo',
  'aston-martin': 'Aston Martin',
  'harley-davidson': 'Harley-Davidson',
  'mercedes-benz': 'Mercedes-Benz',
};

const capitalize = (word: string) => (word ? word[0].toUpperCase() + word.slice(1) : word);

export function brandName(brand: string): string {
  return BRAND_NAMES[brand] ?? brand.split(' ').map(capitalize).join(' ');
}

const MODEL_NAMES: Record<string, string> = { '4runner': '4Runner' };

function modelToken(token: string): string {
  if (MODEL_NAMES[token]) return MODEL_NAMES[token];
  if (token.includes('-')) {
    // f-150, cr-v, c-hr, cx-5, gt-r -> codes; c-max, e-series -> C-Max, E-Series
    return token
      .split('-')
      .map((part) => (part.length <= 2 || /\d/.test(part) ? part.toUpperCase() : capitalize(part)))
      .join('-');
  }
  if (/^[a-z]{1,3}\d+$/.test(token)) return token.toUpperCase(); // rav4, x5, q5, c300
  if (/^\d/.test(token)) return token; // 328i, 500, 86
  return capitalize(token); // camry, mazda3, cruiser
}

export function modelName(model: string): string {
  return model.split(' ').map(modelToken).join(' ');
}

export function vehicleName(brand: string, model: string): string {
  return `${brandName(brand)} ${modelName(model)}`;
}
