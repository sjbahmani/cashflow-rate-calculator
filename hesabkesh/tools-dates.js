const DAY = 86400000;
const calendar = new Intl.DateTimeFormat('en-US-u-ca-persian', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});
export function englishDigits(value) {
  return String(value).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function parts(time) {
  const p = Object.fromEntries(calendar.formatToParts(time).map(p => [p.type,p.value]));
  return [Number(p.year),Number(p.month),Number(p.day)];
}
export function solarDate(time) {
  return parts(time).map((n,i) => String(n).padStart(i === 0 ? 4 : 2,'0')).join('/');
}
export function parseSolarDate(value) {
  const match = englishDigits(value).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return NaN;
  const [year,month,day] = match.slice(1).map(Number);
  if (year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1 || day > 31) return NaN;
  const target = year * 10000 + month * 100 + day;
  let lo = Math.floor(Date.UTC(year+621,0,1) / DAY), hi = Math.floor(Date.UTC(year+622,11,31) / DAY);
  while (lo <= hi) {
    const middle = Math.floor((lo+hi)/2);
    const [y,m,d] = parts(middle*DAY);
    const key = y*10000+m*100+d;
    if (key === target) return middle*DAY;
    if (key < target) lo = middle+1; else hi = middle-1;
  }
  return NaN;
}
