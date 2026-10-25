import {compound, investmentReturn} from './investment-math.js?v=0721f7ce3b';
import {solarDate, parseSolarDate} from './tools-dates.js?v=e771544ba7';
import calc from './calc.js?v=6d6f4b8171';
import {persianDigits, formatNumberInput, parseNumberInput} from './number-display.js?v=7688f3b7f2';
const $ = id => document.getElementById(id);
const number = input => parseNumberInput(input.value);
const moneyFormat = new Intl.NumberFormat('fa-IR', {maximumFractionDigits:0});
const money = value => moneyFormat.format(value)+' تومان';
const percent = value => {
  const rate = Math.abs(value * 100) < 0.05 ? 0 : value * 100;
  return new Intl.NumberFormat('fa-IR', {maximumFractionDigits:1, minimumFractionDigits:1, notation:Math.abs(rate) >= 1e7 ? 'scientific' : 'standard'}).format(rate)+'٪';
};
const setText = (id,value) => { $(id).textContent = value; };
let compoundMode = 'percent';
let nextDepositId = 0;

window.selectMoreTool = name => {
  for (const tool of ['compound','return']) {
    const active = name === tool;
    $('tool-'+tool).hidden = !active;
    const button = $('tool-tab-'+tool);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('active',active);
  }
};
window.setCompoundMode = mode => {
  if (mode === compoundMode) return;
  const principal = number($('compound-principal'));
  const previous = number($('compound-yield'));
  if (principal > 0 && Number.isFinite(previous)) {
    const converted = mode === 'amount' ? principal * previous / 100 : previous / principal * 100;
    $('compound-yield').value = formatNumberInput(String(Number(converted.toFixed(8))), mode === 'amount' ? 'money' : 'rate');
  } else if (Number.isFinite(previous) && previous !== 0) {
    $('compound-yield').value = '';
  }
  compoundMode = mode;
  $('compound-mode-percent').setAttribute('aria-pressed',String(mode === 'percent'));
  $('compound-mode-amount').setAttribute('aria-pressed',String(mode === 'amount'));
  $('compound-mode-percent').classList.toggle('active',mode === 'percent');
  $('compound-mode-amount').classList.toggle('active',mode === 'amount');
  $('compound-yield-label').textContent = mode === 'amount' ? 'مبلغ سود ماه اول (تومان)' : 'نرخ سود ماهانه (٪)';
  $('compound-yield').placeholder = mode === 'amount' ? 'مثلاً ۲٬۰۰۰٬۰۰۰' : 'مثلاً ۲';
  invalidate('compound');
};
function renderReturnReference(prefix, annualRate) {
  const profile = calc.benchmarkProfile(annualRate * 100, 'return');
  const badge = $(prefix+'-badge');
  badge.textContent = profile.title;
  badge.className = 'verdict-title ' + profile.tone;
}
function renderInvestmentChart(id, principal, finalValue) {
  const chart = $(id+'-chart');
  const loss = finalValue < principal;
  const base = loss ? finalValue : principal;
  const change = Math.abs(finalValue - principal);
  const total = base + change;
  chart.querySelector('.receipt-principal').style.width = (total > 0 ? base / total * 100 : 100)+'%';
  const extra = chart.querySelector('.receipt-extra');
  extra.style.width = (total > 0 ? change / total * 100 : 0)+'%';
  extra.hidden = change === 0;
  const baseLabel = loss ? 'ارزش باقی‌مانده' : 'اصل سرمایه';
  const changeLabel = loss ? 'زیان' : 'سود';
  chart.querySelector('.chart-base-label').textContent = baseLabel;
  chart.querySelector('.chart-profit-label').textContent = changeLabel;
  chart.setAttribute('aria-label',baseLabel+': '+money(base)+'، '+changeLabel+': '+money(change));
}
function renderMoneyHeadline(value) {
  const amount = document.createElement('span');
  amount.textContent = money(value).replace(/\s*تومان$/, '');
  const currency = document.createElement('span');
  currency.className = 'receipt-currency'; currency.textContent = ' تومان';
  $('compound-final').replaceChildren(amount, currency);
}
function invalidate(prefix) {
  $(prefix+'-result').hidden = true;
  $(prefix+'-placeholder').hidden = false;
  $(prefix+'-error').classList.remove('show');
  $(prefix+'-error').textContent = '';
  $(prefix+'-form').querySelectorAll('[aria-invalid]').forEach(field => {
    field.removeAttribute('aria-invalid');
    const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== prefix+'-error');
    if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
    else field.removeAttribute('aria-describedby');
  });
}
function showResult(prefix) {
  $(prefix+'-placeholder').hidden = true;
  const result = $(prefix+'-result');
  result.hidden = false;
  result.focus({preventScroll:true});
  if (matchMedia('(max-width:680px)').matches) result.scrollIntoView({block:'start',behavior:preferredScrollBehavior()});
}
function showError(prefix,error) {
  invalidate(prefix);
  const box = $(prefix+'-error');
  box.textContent = error.message;
  box.classList.add('show');
  if (error.field) {
    error.field.setAttribute('aria-invalid','true');
    const descriptions = new Set((error.field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    descriptions.add(prefix+'-error');
    error.field.setAttribute('aria-describedby',[...descriptions].join(' '));
    error.field.focus();
  } else {
    box.tabIndex = -1; box.focus();
  }
}
function readRequired(id,label) {
  const field = $(id), value = number(field);
  if (!Number.isFinite(value)) throw Object.assign(new Error(label+' را وارد کن.'),{field});
  return value;
}
function requireCondition(id, condition, message) {
  if (!condition) throw Object.assign(new Error(message), {field:$(id)});
}
function dateValue(field,label) {
  const value = parseSolarDate(field.value);
  if (!Number.isFinite(value)) throw Object.assign(new Error(label+' معتبر نیست؛ تاریخ شمسی را مثل ۱۴۰۴/۰۸/۰۳ وارد کن.'),{field});
  return value;
}
function todaySolar() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return persianDigits(p.year+'/'+p.month+'/'+p.day);
}
function refreshDepositLabels() {
  const rows = [...$('investment-deposits').children];
  rows.forEach((row,index) => {
    row.querySelector('strong').textContent = 'واریز '+calc.toPersian(index+1);
    const remove = row.querySelector('button');
    remove.hidden = rows.length === 1;
    remove.setAttribute('aria-label','حذف واریز '+calc.toPersian(index+1));
  });
}
function addDeposit(date='',amount='') {
  const id = ++nextDepositId;
  const row = document.createElement('div');
  row.className = 'investment-deposit';
  row.innerHTML = `<div class="deposit-heading"><strong></strong><button class="deposit-remove" type="button">حذف</button></div><div class="row-2"><div class="field"><label for="deposit-date-${id}">تاریخ واریز <span class="hint">(شمسی)</span></label><input id="deposit-date-${id}" class="deposit-date" type="text" dir="ltr" inputmode="numeric" placeholder="۱۴۰۴/۰۸/۰۳" aria-describedby="investment-dates-help" autocomplete="off" required></div><div class="field"><label for="deposit-amount-${id}">مبلغ واریز <span class="hint">(تومان)</span></label><input id="deposit-amount-${id}" class="deposit-amount" type="text" inputmode="numeric" placeholder="مثلاً ۵۰٬۰۰۰٬۰۰۰" autocomplete="off" required></div></div>`;
  row.querySelector('.deposit-date').value = formatNumberInput(date, 'date');
  row.querySelector('.deposit-amount').value = formatNumberInput(amount, 'money');
  row.querySelector('button').addEventListener('click',() => {
    if ($('investment-deposits').children.length <= 1) return;
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove(); refreshDepositLabels(); invalidate('return');
    next.querySelector('input').focus();
  });
  $('investment-deposits').append(row);
  refreshDepositLabels();
  return row;
}
$('investment-add').addEventListener('click',() => {
  const row = addDeposit(); invalidate('return'); row.querySelector('input').focus();
});
for (const prefix of ['compound','return']) {
  $(prefix+'-form').addEventListener('input',() => invalidate(prefix));
  $(prefix+'-form').addEventListener('change',() => invalidate(prefix));
  $(prefix+'-form').addEventListener('reset',event => {
    event.preventDefault();
    if (prefix === 'compound') {
      ['compound-principal','compound-yield','compound-months'].forEach(id => { $(id).value=''; });
      setCompoundMode('percent');
    } else {
      $('investment-deposits').replaceChildren(); addDeposit();
      $('investment-final-date').value = todaySolar(); $('investment-final-value').value = '';
    }
    invalidate(prefix);
  });
}
$('compound-form').addEventListener('submit',event => {
  event.preventDefault(); invalidate('compound');
  try {
    const principal = readRequired('compound-principal','مبلغ اولیه');
    const inputYield = readRequired('compound-yield','سود ماهانه');
    const months = readRequired('compound-months','مدت سرمایه‌گذاری');
    requireCondition('compound-principal', principal > 0, 'مبلغ اولیه باید بیشتر از صفر باشد.');
    requireCondition('compound-principal', principal <= Number.MAX_SAFE_INTEGER, 'مبلغ اولیه برای محاسبهٔ دقیق بیش از حد بزرگ است.');
    requireCondition('compound-yield', inputYield >= 0, 'سود ماهانه باید صفر یا بیشتر باشد.');
    requireCondition('compound-months', Number.isInteger(months) && months >= 1 && months <= 1200, 'مدت را به تعداد ماه کامل، بین ۱ تا ۱۲۰۰ وارد کن.');
    const monthlyRate = compoundMode === 'amount' ? inputYield / principal : inputYield / 100;
    const result = compound({principal,monthlyRate,months});
    renderMoneyHeadline(result.finalValue); setText('compound-base',money(principal));
    renderInvestmentChart('compound',principal,result.finalValue);
    renderReturnReference('compound', result.annualRate);
    setText('compound-profit',money(result.profit)); setText('compound-extra',money(result.compoundExtra));
    setText('compound-annual',percent(result.annualRate));
    setText('compound-summary','پس از '+calc.toPersian(months)+' ماه، با نرخ ثابت ماهانهٔ '+percent(monthlyRate)+'، موجودی تو به '+money(result.finalValue)+' می‌رسد. بدون سرمایه‌گذاری دوبارهٔ سود، مجموع اصل و سود '+money(result.simpleValue)+' بود.');
    showResult('compound');
  } catch(error) { showError('compound',error); }
});
$('return-form').addEventListener('submit',event => {
  event.preventDefault(); invalidate('return');
  try {
    const finalDate = dateValue($('investment-final-date'),'تاریخ ارزش‌گذاری');
    const finalValue = readRequired('investment-final-value','ارزش نهایی دارایی');
    requireCondition('investment-final-value', finalValue >= 0, 'ارزش نهایی دارایی باید صفر یا بیشتر باشد.');
    requireCondition('investment-final-value', finalValue <= Number.MAX_SAFE_INTEGER, 'ارزش نهایی برای محاسبهٔ دقیق بیش از حد بزرگ است.');
    const deposits = [...$('investment-deposits').children].map((row,index) => {
      const date = dateValue(row.querySelector('.deposit-date'),'تاریخ واریز '+calc.toPersian(index+1));
      if (date > finalDate) throw Object.assign(new Error('تاریخ واریز نمی‌تواند بعد از تاریخ ارزش‌گذاری باشد.'), {field:row.querySelector('.deposit-date')});
      const field = row.querySelector('.deposit-amount');
      const amount = number(field);
      if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('مبلغ واریز '+calc.toPersian(index+1)+' باید بیشتر از صفر باشد.'),{field});
      if (amount > Number.MAX_SAFE_INTEGER) throw Object.assign(new Error('مبلغ واریز برای محاسبهٔ دقیق بیش از حد بزرگ است.'), {field});
      return {date,amount};
    });
    const result = investmentReturn({deposits,finalDate,finalValue});
    setText('investment-annual',percent(result.annualRate)); setText('investment-total',money(result.total));
    renderReturnReference('investment', result.annualRate);
    renderInvestmentChart('investment',result.total,finalValue);
    setText('investment-final',money(finalValue)); setText('investment-profit',money(result.profit));
    setText('investment-growth',percent(result.totalReturn));
    setText('investment-summary','از اولین واریز تا ارزش‌گذاری '+calc.toPersian(result.days)+' روز گذشته است. این بازده سالانه با زمان ورود پول وزن‌دهی شده و با درصد سود کل دوره فرق دارد.'+(result.days<365 ? ' دوره کمتر از یک سال است؛ نرخ سالانه معادل‌سازی شده است.' : ''));
    showResult('return');
  } catch(error) { showError('return',error); }
});
$('compound-example').addEventListener('click',() => {
  setCompoundMode('percent'); $('compound-principal').value='۱۰۰٬۰۰۰٬۰۰۰';
  $('compound-yield').value='۲'; $('compound-months').value='۱۲'; $('compound-form').requestSubmit();
});
$('return-example').addEventListener('click',() => {
  const finalDate = parseSolarDate(todaySolar());
  $('investment-deposits').replaceChildren();
  addDeposit(solarDate(finalDate-730*86400000),'۱۰۰٬۰۰۰٬۰۰۰');
  addDeposit(solarDate(finalDate-365*86400000),'۱۰۰٬۰۰۰٬۰۰۰');
  $('investment-final-date').value = persianDigits(solarDate(finalDate)); $('investment-final-value').value='۲۳۱٬۰۰۰٬۰۰۰';
  $('return-form').requestSubmit();
});
document.querySelector('.tools-tabs').addEventListener('keydown',event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const current = $('tool-return').hidden ? 'compound' : 'return';
  const name = event.key === 'Home' ? 'compound' : event.key === 'End' ? 'return' : current === 'compound' ? 'return' : 'compound';
  selectMoreTool(name); $('tool-tab-'+name).focus(); syncUrl();
});
addDeposit(); $('investment-final-date').value = todaySolar();

$('panel-tools').addEventListener('input', event => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement) || event.isComposing) return;
  const kind = field.matches('.deposit-date,#investment-final-date') ? 'date'
    : field.matches('.deposit-amount') ? 'money'
    : field.id === 'compound-yield' ? (compoundMode === 'amount' ? 'money' : 'rate')
    : field.dataset.fmt;
  if (!kind) return;
  const old = field.value;
  const cursor = field.selectionStart;
  field.value = formatNumberInput(old, kind);
  if (cursor !== null) {
    const position = Math.max(0, cursor + field.value.length - old.length);
    field.setSelectionRange(position, position);
  }
});

$('panel-tools').addEventListener('focusout', event => {
  const field = event.target;
  if (!field.matches('.deposit-date,#investment-final-date')) return;
  const date = parseSolarDate(field.value);
  if (Number.isFinite(date)) field.value = persianDigits(solarDate(date));
});
