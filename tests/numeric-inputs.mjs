import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import calc from '../hesabkesh/calc.js';
const html = readFileSync(new URL('../hesabkesh/index.html', import.meta.url), 'utf8');
const fields = {};
const ctx = vm.createContext({
  document: { getElementById: id => fields[id] ||= {value:''} },
  toPersian: text => String(text).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[digit]),
});
for (const name of ['toEn','v','setFmtValue','applyMoneyFmt','applyCountFmt','applyRateFmt','rawNum','parseVarPayments']) {
  vm.runInContext(html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0], ctx);
}
const convert = (text, digits) => text.replace(/[0-9]/g, digit => digits[digit]);
for (const digits of ['0123456789','۰۱۲۳۴۵۶۷۸۹','٠١٢٣٤٥٦٧٨٩']) {
  for (const [, tag] of html.matchAll(/(<input[^>]*data-fmt="[^"]+"[^>]*>)/g)) {
    const id = tag.match(/id="([^"]+)"/)[1];
    const type = tag.match(/data-fmt="([^"]+)"/)[1];
    const input = type === 'money' ? '100,000,000' : type === 'rate' ? '23.5' : '24';
    const expected = type === 'money' ? 100000000 : type === 'rate' ? 23.5 : 24;
    ctx.setFmtValue(id, convert(input, digits), type);
    assert.equal(ctx.v(id), expected, id);
    assert.equal(Number(ctx.rawNum(id)), expected, id+' shared URL');
    ctx.setFmtValue(id, '', type);
    assert.equal(fields[id].value, '');
    ctx.setFmtValue(id, convert('0', digits), type);
    assert.equal(ctx.v(id), 0);
  }
  fields['inst-payments-var'] = {value:convert('6,000,000\n0\n6,000,000',digits)};
  assert.deepEqual(Array.from(ctx.parseVarPayments()), [6000000,0,6000000]);
}
assert.equal(ctx.toEn('‎۱۰۰٬۰۰۰٬۰۰۰‏'), '100000000');
assert.equal(ctx.toEn('٢٣٫٥'), '23.5');
assert.equal(ctx.toEn('۲3٫۵'), '23.5');
for (const tag of html.match(/<(?:input|textarea)\b[^>]*>/g)) {
  if (tag.includes('type="hidden"')) continue;
  if (tag.includes('data-fmt=') || tag.includes('textarea')) assert.ok(/autocomplete="off"/.test(tag), 'numeric fields suppress browser autocomplete');
  assert.ok(!/value="[^"]+"/.test(tag), 'no prefilled numeric fields');
}
assert.ok(html.includes('placeholder="مثلاً ۵۰٬۰۰۰٬۰۰۰"'));
assert.ok(html.includes('مثلاً ۲۳'));
const og = vm.createContext({calc});
vm.runInContext(readFileSync(new URL('../hesabkesh/og.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export default { page };',''),og);
const args={cash:'100000000',pmt:'10000000',n:'12',down:'0'};
const expected = JSON.stringify(og.resultFromQuery(args));
for (const digits of ['۰۱۲۳۴۵۶۷۸۹','٠١٢٣٤٥٦٧٨٩']) {
  const translated=Object.fromEntries(Object.entries(args).map(([key,value])=>[key,convert(value,digits)]));
  assert.equal(JSON.stringify(og.resultFromQuery(translated)),expected);
}
console.log('Passed: all numeric fields accept English, Persian and Arabic digits; decimals, grouping, mixed digits, zero, empty fields, variable payments and preview parity.');
