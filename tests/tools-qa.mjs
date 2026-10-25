import assert from 'node:assert/strict';
import {compound,investmentReturn} from '../hesabkesh/investment-math.js';
import {formatNumberInput,parseNumberInput} from '../hesabkesh/number-display.js';
import {parseSolarDate,solarDate} from '../hesabkesh/tools-dates.js';
assert.equal(parseNumberInput(formatNumberInput('-1000','money')),-1000);
assert.equal(parseNumberInput(formatNumberInput('1.5','count')),1.5);
assert.equal(parseNumberInput('١٬٢٣٤٫٥'),1234.5);
assert.equal(parseNumberInput('‎−۲٬۰۰۰'),-2000);
for(const invalid of ['', '0x10', '1e3', 'Infinity', '12abc', '-', '.']) assert.ok(Number.isNaN(parseNumberInput(invalid)),invalid);
assert.equal(formatNumberInput('14050803','date'),'۱۴۰۵/۰۸/۰۳');
assert.equal(formatNumberInput('۱۴۰۵۰۸۰۳','date'),'۱۴۰۵/۰۸/۰۳');
assert.equal(formatNumberInput('14050','date'),'۱۴۰۵/۰');
assert.equal(formatNumberInput('1405080','date'),'۱۴۰۵/۰۸/۰');
assert.equal(solarDate(parseSolarDate(formatNumberInput('14050803','date'))),'1405/08/03');
assert.throws(()=>compound({principal:1000,monthlyRate:.02,months:1.5}));
assert.throws(()=>compound({principal:-1000,monthlyRate:.02,months:12}));
assert.throws(()=>compound({principal:1e16,monthlyRate:0,months:12}));
assert.throws(()=>compound({principal:1e12,monthlyRate:1,months:100}));
assert.throws(()=>investmentReturn({deposits:[{date:0,amount:100}],finalDate:365*86400000,finalValue:1e16}));
// Known single-deposit CAGR, spanning losses, short periods and long periods.
const day=86400000,end=Date.UTC(2026,9,25);
for(const days of [1,7,31,180,365,730,1825]) for(const growth of [.1,.5,1,1.01,1.5,2]) {
 const r=investmentReturn({deposits:[{date:end-days*day,amount:100}],finalDate:end,finalValue:100*growth});
 const expected=growth**(365/days)-1;
 assert.ok(Math.abs(r.annualRate-expected)<=1e-10*Math.max(1,Math.abs(expected)));
}
// Independently generated terminal values must recover a known constant return.
let seed=137;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
for(let i=0;i<150;i++) {
 const rate=-.6+random()*1.8;
 const deposits=Array.from({length:1+Math.floor(random()*9)},()=>({date:end-(1+Math.floor(random()*1500))*day,amount:100+random()*9000}));
 const finalValue=deposits.reduce((sum,f)=>sum+f.amount*(1+rate)**((end-f.date)/day/365),0);
 const result=investmentReturn({deposits,finalDate:end,finalValue});
 assert.ok(Math.abs(result.annualRate-rate)<1e-9);
}
console.log('Passed QA regressions: signed/decimal/invalid entries, numeric-keyboard dates, safe monetary bounds, 42 CAGR cases, 150 irregular-deposit recovery cases.');
