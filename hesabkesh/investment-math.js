// Investment calculations; all returns are before inflation, fees and taxes.
const DAY = 86400000;
export function compound({principal, monthlyRate, months}) {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error('مبلغ اولیه باید بیشتر از صفر باشد.');
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) throw new Error('سود ماهانه باید صفر یا بیشتر باشد.');
  if (!Number.isInteger(months) || months < 1 || months > 1200) throw new Error('مدت را بین ۱ تا ۱۲۰۰ ماه وارد کن.');
  if (principal > Number.MAX_SAFE_INTEGER) throw new Error('مبلغ اولیه برای محاسبهٔ دقیق بیش از حد بزرگ است.');
  const finalValue = principal * Math.pow(1 + monthlyRate, months);
  const simpleValue = principal * (1 + monthlyRate * months);
  const annualRate = Math.expm1(12 * Math.log1p(monthlyRate));
  if (![finalValue, simpleValue, annualRate].every(Number.isFinite)) throw new Error('نتیجه از محدودهٔ محاسبه بزرگ‌تر است؛ نرخ یا مدت را کمتر کن.');
  if (finalValue > Number.MAX_SAFE_INTEGER) throw new Error('موجودی نهایی برای نمایش دقیق بیش از حد بزرگ می‌شود؛ نرخ یا مدت را کمتر کن.');
  return {finalValue, profit: finalValue - principal, simpleValue, compoundExtra: finalValue - simpleValue, annualRate};
}

// Deposits grow to the terminal valuation. With positive deposits and one
// terminal value this equation is monotonic, so bisection has a unique root.
// Solve in log(1+r), allowing negative annual returns without crossing r=-1.
export function investmentReturn({deposits, finalDate, finalValue}) {
  if (!Array.isArray(deposits) || !deposits.length) throw new Error('حداقل یک واریز اضافه کن.');
  if (!Number.isFinite(finalDate)) throw new Error('تاریخ ارزش‌گذاری معتبر نیست.');
  if (!Number.isFinite(finalValue) || finalValue < 0) throw new Error('ارزش نهایی باید صفر یا بیشتر باشد.');
  if (finalValue > Number.MAX_SAFE_INTEGER) throw new Error('ارزش نهایی برای محاسبهٔ دقیق بیش از حد بزرگ است.');
  let total = 0, earliest = finalDate, sameDay = 0;
  const flows = deposits.map(deposit => {
    if (!Number.isFinite(deposit.amount) || deposit.amount <= 0) throw new Error('مبلغ همهٔ واریزها باید بیشتر از صفر باشد.');
    if (!Number.isFinite(deposit.date)) throw new Error('تاریخ یکی از واریزها معتبر نیست.');
    if (deposit.date > finalDate) throw new Error('تاریخ واریز نمی‌تواند بعد از تاریخ ارزش‌گذاری باشد.');
    total += deposit.amount;
    earliest = Math.min(earliest, deposit.date);
    if (deposit.date === finalDate) sameDay += deposit.amount;
    return {amount:deposit.amount, years:(finalDate - deposit.date) / DAY / 365};
  });
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) throw new Error('مجموع واریزها بیش از محدودهٔ محاسبه است.');
  if (earliest === finalDate) throw new Error('برای بازده سالانه، حداقل یک واریز باید قبل از تاریخ ارزش‌گذاری باشد.');
  if (sameDay > 0 && finalValue <= sameDay) throw new Error('با این ارزش نهایی و واریزِ روز آخر، بازده سالانهٔ قابل محاسبه‌ای وجود ندارد؛ تاریخ‌ها و مبلغ‌ها را بررسی کن.');
  let annualRate;
  if (finalValue === 0) annualRate = -1;
  else {
    const balance = q => flows.reduce((sum, flow) => sum + flow.amount / total * Math.exp(q * flow.years), 0);
    const target = finalValue / total;
    let low = -1, high = 1;
    while (balance(low) > target && low > -1024) low *= 2;
    while (balance(high) < target && high < 1024) high *= 2;
    if (balance(low) > target || balance(high) < target) throw new Error('بازده در این بازهٔ زمانی خارج از محدودهٔ محاسبه است.');
    for (let i = 0; i < 240; i++) {
      const middle = (low + high) / 2;
      if (balance(middle) > target) high = middle; else low = middle;
    }
    annualRate = Math.expm1((low + high) / 2);
    if (!Number.isFinite(annualRate * 100)) throw new Error('بازده سالانه بسیار بزرگ است؛ تاریخ‌ها را بررسی کن.');
  }
  return {annualRate, total, profit:finalValue - total, totalReturn:finalValue / total - 1, days:Math.round((finalDate - earliest) / DAY)};
}
