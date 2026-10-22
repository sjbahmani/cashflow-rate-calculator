/* Receipt presentation only; all financial calculations remain in calc.js. */
function updateReceipt(prefix) {
  const card = document.getElementById(prefix + '-result');
  const principal = card.querySelector('.receipt-principal');
  if (!principal) return;
  const baseId = prefix === 'inst' ? 'inst-r-cash' : 'loan-r-amount';
  const base = parseFloat(toEn(document.getElementById(baseId).textContent).replace(/[^0-9.-]/g, '')) || 0;
  const extra = parseFloat(toEn(document.getElementById(prefix + '-r-extra').textContent).replace(/[^0-9.-]/g, '')) || 0;
  const total = base + extra;
  const share = total > 0 ? Math.max(0, Math.min(100, base / total * 100)) : 100;
  principal.style.width = share + '%';
  card.querySelector('.receipt-extra').style.width = (100 - share) + '%';
  card.querySelector('.receipt-chart').hidden = extra < 0 || total <= 0;
  card.querySelector('.receipt-chart').setAttribute('aria-label', 'اصل مبلغ: ' + fmt(base) + '، اضافه‌پرداخت: ' + fmt(extra));
}
async function shareReceipt(button, prefix) {
  if (!receiptStates[prefix]) return;
  const params = new URLSearchParams(receiptStates[prefix]);
  params.set('shared', '1');
  const url = new URL(location.pathname, location.origin);
  url.search = params.toString();
  try {
    await navigator.clipboard.writeText(url.href);
    button.textContent = 'پیوند نتیجه کپی شد ✓';
  } catch (_) {
    const field = document.createElement('input');
    field.value = url.href;
    field.readOnly = true;
    field.setAttribute('aria-label', 'پیوند نتیجه؛ برای کپی انتخاب کن');
    button.after(field);
    field.focus(); field.select();
    button.textContent = 'پیوند زیر را کپی کن';
  }
  setTimeout(() => { button.textContent = '↗ اشتراک نتیجه'; }, 2500);
}
document.addEventListener('DOMContentLoaded', () => {
  for (const prefix of ['inst', 'loan']) {
    const card = document.getElementById(prefix + '-result');
    const title = document.createElement('h2');
    title.className = 'receipt-title'; title.textContent = 'صورت‌حساب واقعی';
    const rate = document.getElementById(prefix + '-r-apr').closest('.result-row');
    rate.classList.add('receipt-rate');
    card.prepend(rate); card.prepend(title);
    card.querySelector('h3').remove();
    const summary = card.querySelector('.result-summary');
    rate.after(summary);
    const details = document.createElement('details'); details.className = 'receipt-details';
    details.innerHTML = '<summary>جزئیات بیشتر و روش خواندن نتیجه</summary>';
    const keep = prefix === 'inst' ? ['inst-r-cash', 'inst-r-total', 'inst-r-extra', 'inst-r-monthly'] : ['loan-r-amount', 'loan-r-payment', 'loan-r-total', 'loan-r-extra', 'loan-r-monthly'];
    for (const row of [...card.querySelectorAll(':scope > .result-row')]) {
      if (row !== rate && !keep.some(id => row.querySelector('#' + id))) details.append(row);
    }
    details.append(card.querySelector('.verdict'));
    const chart = document.createElement('div'); chart.className = 'receipt-chart'; chart.setAttribute('role', 'img');
    chart.innerHTML = '<div class="receipt-bar"><span class="receipt-principal"></span><span class="receipt-extra"></span></div><div class="receipt-legend"><span>اصل مبلغ</span><span>اضافه‌پرداخت</span></div>';
    card.append(chart, details);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'receipt-share'; button.textContent = '↗ اشتراک نتیجه'; button.setAttribute('aria-live', 'polite'); button.addEventListener('click', () => shareReceipt(button, prefix)); card.append(button);
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-atomic', 'true');
    updateReceipt(prefix);
  }
  document.querySelectorAll('label:not([for])').forEach(label => {
    const input = label.parentElement.querySelector('input:not([type=hidden]),select,textarea');
    if (input && input.id) label.htmlFor = input.id;
  });
});
