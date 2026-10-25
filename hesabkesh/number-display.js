import {englishDigits} from './tools-dates.js?v=e771544ba7';
export function persianDigits(value) {
  return englishDigits(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
// Formatting never turns an invalid or negative entry into a valid positive one.
export function formatNumberInput(value, kind) {
  if (kind === 'date') {
    let raw = englishDigits(value).replace(/-/g,'/');
    // Numeric mobile keyboards need not expose a slash key.
    if (/^\d{5,8}$/.test(raw)) raw = raw.slice(0,4)+'/'+raw.slice(4,6)+(raw.length > 6 ? '/'+raw.slice(6) : '');
    return persianDigits(raw);
  }
  const raw = englishDigits(value).replace(/[٬,]/g,'').replace(/٫/g,'.');
  if (!/^-?\d*(?:\.\d*)?$/.test(raw)) return persianDigits(value);
  const [integer, fraction] = raw.split('.');
  const grouped = kind === 'money' ? integer.replace(/\B(?=(\d{3})+(?!\d))/g,'٬') : integer;
  return persianDigits(grouped + (fraction === undefined ? '' : '٫'+fraction));
}

export function formatPaymentLines(value) {
  return String(value).split('\n').map(line => formatNumberInput(line, 'money')).join('\n');
}

export function parseNumberInput(value) {
  const raw = englishDigits(value).replace(/[٬,\s\u200e\u200f\u061c]/g,'').replace(/٫/g,'.').replace(/−/g,'-');
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) ? Number(raw) : NaN;
}
