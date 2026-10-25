import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { formatPaymentLines } from '../hesabkesh/number-display.js';

const html = readFileSync(new URL('../hesabkesh/index.html', import.meta.url), 'utf8');
const source = html.match(/function restoreFromUrl\(\) \{[\s\S]*?\n\}/)[0];
function restore(search) {
  const fields = {};
  const calls = {};
  const context = {
    formatPaymentLines,
    profitIsPercent: () => new URLSearchParams(search).get('su') === 'percent', URLSearchParams, location: { search }, restoringState: false,
    document: {
      body: { dataset: {} },
      getElementById(id) {
        return fields[id] ||= { value: '', classList: { contains: () => false } };
      },
    },
    setFmtValue(id, value) { context.document.getElementById(id).value = value; },
  };
  for (const name of ['setInstallmentKind', 'setProfitUnit', 'setInstallmentEntryMode', 'toggleVariable',
    'setFirstPaymentTiming', 'setInstallmentDownVisibility', 'setStoreKind',
    'updateVarCounter', 'updateStoreDerived', 'setLoanType', 'toggleGrace',
    'setSelectIfValid', 'switchTab', 'selectMoreTool', 'calcInstallment', 'calcLoan']) {
    context[name] = (...args) => { calls[name] = args; };
  }
  vm.runInNewContext(html.match(/function toEn\(s\) \{[\s\S]*?\n\}/)[0] + '\n' + source + '\nrestoreFromUrl();', context);
  assert.equal(context.restoringState, false);
  return { fields, calls };
}
const example = '?inst=loan&cash=200000000&pmt=18815300&n=12';
let result = restore(example);
assert.equal(result.fields['inst-cash'].value, '200000000');
assert.equal(result.fields['inst-payment'].value, '18815300');
assert.equal(result.fields['inst-n'].value, '12');
assert.deepEqual(result.calls.setInstallmentKind, ['loan']);
assert.equal(result.calls.calcInstallment, undefined);
assert.ok(restore(example + '&shared=1').calls.calcInstallment);
result = restore('?cash=10000000&mode=store&kind=extra&sv=0&sn=12&down=0&first=now');
assert.equal(result.fields['inst-store-value'].value, '0');
assert.equal(result.fields['inst-store-n'].value, '12');
assert.deepEqual(result.calls.setInstallmentEntryMode, ['store']);
assert.deepEqual(result.calls.setFirstPaymentTiming, [true]);
assert.deepEqual(result.calls.setInstallmentDownVisibility, [true]);
result = restore('?cash=10000000&mode=variable&var=6000000,0,6000000');
assert.ok(result.calls.toggleVariable);
assert.equal(result.fields['inst-payments-var'].value.split('\n').length, 3);
result = restore('?tab=loan&amount=120000000&rate=0&term=24&grace=3&gtype=accumulate');
assert.equal(result.fields['loan-amount'].value, '120000000');
assert.equal(result.fields['loan-rate'].value, '0');
assert.equal(result.fields['loan-n'].value, '24');
assert.equal(result.fields['loan-grace'].value, '3');
assert.deepEqual(result.calls.switchTab, ['loan']);
assert.ok(result.calls.toggleGrace);
assert.equal(result.calls.calcLoan, undefined);
assert.ok(restore('?tab=loan&amount=120000000&rate=0&term=24&shared=1').calls.calcLoan);
assert.deepEqual(restore('?inst=loan').fields, {});
assert.deepEqual(restore('').fields, {});
console.log('Passed: URL fields and modes restore without shared=1; shared links still calculate.');
result = restore('?inst=loan&cash=100000000&mode=store&kind=extra&su=percent&sv=23500000&pv=23.5&sn=24&down=5000000');
assert.deepEqual(result.calls.setProfitUnit,['percent']);
assert.equal(result.fields['inst-profit-rate'].value,'23.5');
assert.equal(result.fields['inst-down'].value,'5000000');
console.log('Passed: percentage profit and upfront fee restore from a shared URL.');

// Generated links must keep sv in the same unit as su. Older running njs
// workers understand this format and do not need the temporary pv extension.
const buildSource = html.match(/function buildStateParams\(prefix\) \{[\s\S]*?\n\}/)[0];
for (const kind of ['purchase', 'loan']) {
  const values = {
    'inst-cash': '100000000', 'inst-profit-rate': '23',
    'inst-store-n': '12', 'inst-down': '15000000',
  };
  const state = vm.createContext({
    URLSearchParams, location: {search:''}, lastCalculatorTab:'installment',
    instKind:kind, instEntryMode:'store', instFirstPaymentNow:false,
    profitIsPercent:()=>true, rawNum:id=>values[id] || '',
    document:{
      querySelector:()=>({id:'panel-installment'}),
      getElementById:id=>({value:id==='inst-store-kind'?'extra':'',classList:{contains:()=>id==='inst-down-panel'}}),
    },
  });
  vm.runInContext(buildSource,state);
  const params=state.buildStateParams('inst');
  assert.equal(params.get('su'),'percent');
  assert.equal(params.get('sv'),'23');
  assert.equal(params.has('pv'),false);
  const roundTrip=restore('?'+params);
  assert.equal(roundTrip.fields['inst-profit-rate'].value,'23');
  assert.equal(roundTrip.fields['inst-down'].value,'15000000');
}
console.log('Passed: generated percentage URLs preserve matching units and restore in purchases and loans.');

result = restore('?tab=tools&tool=return');
assert.deepEqual(result.calls.switchTab,['tools']);
assert.deepEqual(result.calls.selectMoreTool,['return']);
assert.equal(result.calls.calcInstallment,undefined);
assert.equal(result.calls.calcLoan,undefined);
assert.equal(restore('?cash=10000000&mode=variable&var=6000000.5,0,6000000').fields['inst-payments-var'].value,'۶٬۰۰۰٬۰۰۰٫۵\n۰\n۶٬۰۰۰٬۰۰۰');
console.log('Passed: investment tool routing and localized variable-payment URL restoration.');
