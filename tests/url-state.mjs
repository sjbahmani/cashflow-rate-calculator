import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../hesabkesh/index.html', import.meta.url), 'utf8');
const source = html.match(/function restoreFromUrl\(\) \{[\s\S]*?\n\}/)[0];
function restore(search) {
  const fields = {};
  const calls = {};
  const context = {
    URLSearchParams, location: { search }, restoringState: false,
    document: {
      body: { dataset: {} },
      getElementById(id) {
        return fields[id] ||= { value: '', classList: { contains: () => false } };
      },
    },
    setFmtValue(id, value) { context.document.getElementById(id).value = value; },
  };
  for (const name of ['setInstallmentKind', 'setInstallmentEntryMode', 'toggleVariable',
    'setFirstPaymentTiming', 'setInstallmentDownVisibility', 'setStoreKind',
    'updateVarCounter', 'updateStoreDerived', 'setLoanType', 'toggleGrace',
    'setSelectIfValid', 'switchTab', 'calcInstallment', 'calcLoan']) {
    context[name] = (...args) => { calls[name] = args; };
  }
  vm.runInNewContext(source + '\nrestoreFromUrl();', context);
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
