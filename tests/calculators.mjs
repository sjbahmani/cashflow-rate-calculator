import assert from 'node:assert/strict';
import calc from '../hesabkesh/calc.js';
const purchase = {cash:30000000,down:0,mode:'payment',payment:3000000,n:10,firstPaymentNow:false,kind:'purchase'};
let result=calc.installment(purchase);
assert.equal(result.error,undefined); assert.equal(result.ear,0); assert.equal(result.extra,0);
result=calc.installment({...purchase,payment:3800000});
assert.ok(Math.abs(result.ear-70.4919532133)<1e-6); assert.equal(result.totalPaid,38000000);
result=calc.installment({...purchase,mode:'store',storeKind:'extra',storeValue:0,storeN:10});
assert.equal(result.ear,0); assert.equal(result.extra,0);
result=calc.installment({...purchase,mode:'store',storeKind:'total',storeValue:30000000,storeN:10});
assert.equal(result.ear,0);
const schedule={...purchase,cash:10000000,mode:'variable',varPayments:[6000000,0,6000000]};
result=calc.installment(schedule);
assert.equal(result.n,3); assert.equal(result.totalPaid,12000000);
const monthly=Math.pow(1+result.ear/100,1/12)-1;
assert.ok(Math.abs(6000000/(1+monthly)+6000000/Math.pow(1+monthly,3)-10000000)<0.01);
assert.ok(result.ear<calc.installment({...schedule,varPayments:[6000000,6000000]}).ear);
assert.ok(calc.installment({...schedule,varPayments:[6000000,NaN,6000000]}).error);
assert.ok(calc.installment({...purchase,n:2.5}).error);
assert.ok(calc.installment({...purchase,payment:2000000}).error);
result=calc.installment({...purchase,firstPaymentNow:true});assert.equal(result.ear,0);
result=calc.loan({amount:120000000,rateAnn:0,n:24,grace:3,graceType:'accumulate',loanType:'on-balance'});
assert.equal(result.ear,0);assert.equal(result.totalPaid,120000000);assert.equal(result.payment,120000000/21);
result=calc.loan({amount:120000000,rateAnn:18,n:24,grace:0,graceType:'accumulate',loanType:'on-balance'});
assert.ok(Math.abs(result.ear-((1.015 ** 12 - 1) * 100))<1e-4);
console.log('Passed: zero-cost purchases in all modes, payment timing, zero months, invalid schedules, and bank loans.');
for (const kind of ['purchase', 'loan']) {
  for (const rate of [0, 23, 23.5]) {
    const base = {cash:100000000,down:5000000,mode:'store',storeKind:'extra',storeN:24,kind,firstPaymentNow:false};
    const percent = calc.installment({...base,storeUnit:'percent',storeValue:rate});
    const amount = calc.installment({...base,storeValue:100000000*rate/100});
    assert.deepEqual(percent, amount);
    assert.equal(percent.financedAmount,95000000);
    assert.equal(percent.totalPaid,(100000000+100000000*rate/100)+(kind==='loan'?5000000:0));
  }
}
assert.ok(calc.installment({...purchase,mode:'store',storeKind:'extra',storeUnit:'percent',storeValue:-1,storeN:12}).error);
console.log('Passed: whole-term percentages equal profit amounts for purchases and loans, including fees, down payments, zero and decimal rates.');
