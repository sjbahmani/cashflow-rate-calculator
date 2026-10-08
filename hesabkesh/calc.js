// Shared by the page and the nginx njs link-preview handler (og.js); keep the syntax njs-compatible.

const OFFICIAL_BENCHMARK = 23;

function toPersian(s) {
  return String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function fmt(n) {
  if (n === null || isNaN(n)) return '—';
  const r = Math.round(n);
  const digits = toPersian(String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
  return (r < 0 ? '‎−' : '') + digits + ' تومان';
}
function fmtPct(n) {
  if (isNaN(n) || !isFinite(n)) return '—';
  return toPersian(n.toFixed(1)).replace('.', '٫') + '٪';
}

// Newton-Raphson to solve for monthly rate given PV, PMT, N
function solveRate(pv, pmt, n) {
  if (pmt <= 0 || pv <= 0 || n <= 0) return NaN;
  // Total paid vs principal — if no interest, return 0
  if (Math.abs(pmt * n - pv) < 0.01) return 0;
  let r = 0.01; // initial guess: 1% per month
  for (let i = 0; i < 200; i++) {
    const f  = pv * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1) - pmt;
    const df = pv * (Math.pow(1+r,n)*(1 + r*n) - Math.pow(1+r,n+1) + 1) /
               Math.pow(Math.pow(1+r,n)-1, 2);
    const r2 = r - f/df;
    if (Math.abs(r2 - r) < 1e-10) { r = r2; break; }
    r = r2;
    if (r <= 0) r = 1e-6;
  }
  return r;
}

function aprFromMonthly(r) {
  return (Math.pow(1 + r, 12) - 1) * 100;
}
function monthlyFromAnnualEffective(ear) {
  // ear is a percentage, returns monthly rate as percentage
  return (Math.pow(1 + ear / 100, 1 / 12) - 1) * 100;
}

function rateMultiple(apr) {
  if (!isFinite(apr)) return '';
  return toPersian((apr / OFFICIAL_BENCHMARK).toFixed(1)).replace('.', '٫') + ' برابر';
}

// Verdict text thresholds are calibrated against the 23% reference benchmark used in this tool.
function verdictProfile(apr) {
  if (isNaN(apr) || !isFinite(apr)) {
    return { tone: 'warn', title: 'نیاز به بررسی', msg: 'عددها برای محاسبه نرخ کافی نیستند.' };
  }
  if (apr < 26) {
    return { tone: 'good', title: 'قابل قبول', msg: 'پایین‌تر یا نزدیک نرخ مرجع است؛ از نظر نرخ، پیشنهاد آرام‌تری به نظر می‌رسد.' };
  }
  if (apr < 40) {
    return { tone: 'ok', title: 'کمی گران', msg: 'بالاتر از نرخ مرجع است؛ اگر وام بانکی در دسترس داری، مقایسه‌اش ارزش دارد.' };
  }
  if (apr < 60) {
    return { tone: 'warn', title: 'گران', msg: 'این دیگر فقط قسط‌بندی ساده نیست؛ بخشی جدی از پولت دارد هزینه زمان می‌شود.' };
  }
  if (apr < 90) {
    return { tone: 'high', title: 'خیلی گران', msg: 'نرخ فشارآور است؛ قبل از امضا یک گزینه دیگر هم پیدا کن و مقایسه بگیر.' };
  }
  return { tone: 'bad', title: 'فرار کن', msg: 'ظاهرش قسطی است، باطنش وام با سود سنگین. این پیشنهاد را جدی دوباره بررسی کن.' };
}

// Solver for variable installment schedules.
function solveAnnualEffectiveVariable(pv, payments, firstPaymentNow) {
  const offset = firstPaymentNow ? 0 : 1;
  const npv = rate => payments.reduce((sum, pmt, idx) => {
    return sum + pmt / Math.pow(1 + rate, idx + offset);
  }, 0) - pv;

  let low = 0;
  let high = 1;
  while (npv(high) > 0 && high < 1000000) {
    high *= 2;
  }
  for (let i = 0; i < 160; i++) {
    const mid = (low + high) / 2;
    if (npv(mid) > 0) low = mid;
    else high = mid;
  }
  return aprFromMonthly((low + high) / 2);
}

// Solve the effective annual rate from the full cash flow.
function solveAnnualEffectiveWithGrace(pv, gracePmt, graceN, payment, repayN) {
  if (graceN === 0) {
    const r = solveRate(pv, payment, repayN);
    return aprFromMonthly(r);
  }
  // Newton-Raphson on NPV of all cash flows = PV
  // NPV(r) = sum(gracePmt/(1+r)^t, t=1..graceN) + sum(payment/(1+r)^t, t=graceN+1..graceN+repayN) - pv = 0
  let r = 0.01;
  for (let i = 0; i < 300; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 1; t <= graceN; t++) {
      const disc = Math.pow(1+r, t);
      npv  += gracePmt / disc;
      dnpv -= t * gracePmt / (disc * (1+r));
    }
    for (let t = graceN+1; t <= graceN+repayN; t++) {
      const disc = Math.pow(1+r, t);
      npv  += payment / disc;
      dnpv -= t * payment / (disc * (1+r));
    }
    npv -= pv;
    const r2 = r - npv / dnpv;
    if (Math.abs(r2 - r) < 1e-10) { r = r2; break; }
    r = Math.max(r2, 1e-6);
  }
  return aprFromMonthly(r);
}

// inp: cash, down, mode ('payment' | 'store' | 'variable'), payment, n,
// storeKind ('extra' | 'total'), storeValue, storeN, varPayments, firstPaymentNow,
// kind ('purchase' | 'loan'). For a loan, cash is the loan amount and down is the upfront fee,
// which the lender's stated interest or total repayment does not include.
const INST_WORDS = {
  purchase: { cash: 'قیمت نقدی', down: 'پیش‌پرداخت', extra: 'مجموع اضافه‌پرداخت', total: 'مجموع کل پرداخت', offer: 'پیشنهاد', note: 'در خرید اقساطی همیشه بیشتر از قیمت نقدی پرداخت می‌شود.' },
  loan:     { cash: 'مبلغ وام', down: 'کارمزد', extra: 'سود کل', total: 'مجموع بازپرداخت', offer: 'وام', note: 'وامی که هزینه‌ای ندارد نرخ سودی هم ندارد.' }
};

function installment(inp) {
  const cash = inp.cash;
  const down = inp.down;
  const isLoan = inp.kind === 'loan';
  const w = INST_WORDS[isLoan ? 'loan' : 'purchase'];

  if (!cash) {
    return { error: `لطفاً ${w.cash} را وارد کنید.` };
  }
  if (down >= cash) {
    return { error: `${w.down} نمی‌تواند بیشتر یا مساوی ${w.cash} باشد.` };
  }

  const principal = cash - down;
  let payments, n, totalInstallments, payment;

  if (inp.mode === 'store') {
    n = inp.storeN;
    if (!inp.storeValue || !n) {
      return { error: `لطفاً ${w.extra} یا ${w.total} و تعداد اقساط را وارد کنید.` };
    }
    if (n < 1 || n > 360) {
      return { error: 'تعداد اقساط باید بین ۱ تا ۳۶۰ ماه باشد.' };
    }
    const totalPaidFromStore = inp.storeKind === 'extra' ? cash + inp.storeValue : inp.storeValue;
    if (totalPaidFromStore <= cash) {
      return { error: inp.storeKind === 'extra'
        ? `${w.extra} باید بیشتر از صفر باشد.`
        : `${w.total} باید بیشتر از ${w.cash} باشد.` };
    }
    totalInstallments = isLoan ? totalPaidFromStore : totalPaidFromStore - down;
    payment = totalInstallments / n;
    payments = new Array(Math.round(n)).fill(payment);
    n = payments.length;
  } else if (inp.mode === 'variable') {
    payments = inp.varPayments.filter(p => p > 0);
    n = payments.length;
    if (n < 1) {
      return { error: 'لطفاً حداقل یک مبلغ قسط وارد کنید.' };
    }
    if (n > 360) {
      return { error: 'تعداد اقساط نمی‌تواند بیشتر از ۳۶۰ باشد.' };
    }
    totalInstallments = payments.reduce((s, p) => s + p, 0);
    if (down + totalInstallments <= cash) {
      return { error: `مجموع اقساط از ${w.cash} کمتر یا مساوی است — ${w.note}` };
    }
  } else {
    payment = inp.payment;
    n = inp.n;
    if (!payment || !n) {
      return { error: 'لطفاً مبلغ قسط و تعداد اقساط را وارد کنید.' };
    }
    if (n < 1 || n > 360) {
      return { error: 'تعداد اقساط باید بین ۱ تا ۳۶۰ ماه باشد.' };
    }
    totalInstallments = payment * n;
    if (down + totalInstallments <= cash) {
      return { error: `مجموع اقساط (${w.down} + قسط × تعداد) از ${w.cash} کمتر یا مساوی است — ${w.note}` };
    }
    payments = new Array(Math.round(n)).fill(payment);
    n = payments.length;
  }

  if (inp.firstPaymentNow && payments[0] >= principal) {
    return { error: isLoan
      ? 'قسط امروز تمام پولی را که دستت می‌رسد پوشش می‌دهد؛ برای این حالت نرخ مؤثر قابل محاسبه نیست.'
      : 'پرداخت امروز تمام قیمتِ باقی‌مانده را پوشش می‌دهد؛ برای این حالت نرخ مؤثر قابل محاسبه نیست.' };
  }

  const ear = solveAnnualEffectiveVariable(principal, payments, inp.firstPaymentNow);
  const totalPaid = down + totalInstallments;
  const extra = totalPaid - cash;
  return {
    n: n,
    payment: payment,
    ear: ear,
    totalPaid: totalPaid,
    extra: extra,
    pct: (extra / cash) * 100,
    financedAmount: principal - (inp.firstPaymentNow ? payments[0] : 0),
    summaryLead: `نرخ مؤثر سالانه این ${w.offer} <strong>${fmtPct(ear)}</strong> است؛ یعنی حدود <strong>${rateMultiple(ear)}</strong> نرخ مرجع ۲۳٪. شما در مجموع <strong>${fmt(extra)}</strong> بیشتر از ${w.cash} پرداخت می‌کنید.`
  };
}

// inp: amount, rateAnn, n, loanType ('on-principal' | 'on-balance'), grace, graceType ('accumulate' | 'interest-only')
function loan(inp) {
  const amount = inp.amount;
  const rateAnn = inp.rateAnn;
  const n = inp.n;
  const grace = inp.grace;
  const graceType = inp.graceType;

  if (!amount || !rateAnn || !n) {
    return { error: 'لطفاً مبلغ وام، نرخ سود، و مدت وام را وارد کنید.' };
  }
  if (rateAnn <= 0 || rateAnn > 300) {
    return { error: 'نرخ سود باید عددی مثبت و منطقی باشد (مثلاً ۲۳).' };
  }
  if (n < 1 || n > 360) {
    return { error: 'مدت وام باید بین ۱ تا ۳۶۰ ماه باشد.' };
  }
  if (grace < 0 || grace >= n) {
    return { error: 'دوره تنفس باید کمتر از مدت کل وام باشد.' };
  }

  const rMonthly = (rateAnn / 100) / 12;
  let payment, totalPaid, extra, ear;
  let gracePmt = 0;       // what's paid each month during grace
  let graceTotalPaid = 0; // total outflow during grace period
  let effectivePrincipal = amount; // principal used for repayment phase

  // ── Flat rate ────────────────────────────────────────────────────────────
  if (inp.loanType === 'on-principal') {
    if (grace > 0) {
      if (graceType === 'accumulate') {
        // Interest accumulates, added to principal
        const graceInterest   = amount * rMonthly * grace;
        effectivePrincipal    = amount + graceInterest;
      } else {
        // Interest-only payments during grace
        gracePmt              = amount * rMonthly;
        graceTotalPaid        = gracePmt * grace;
      }
    }
    const repayMonths  = n - grace;
    const repayYears   = repayMonths / 12;
    const repayInterest= effectivePrincipal * (rateAnn / 100) * repayYears;
    const repayTotal   = effectivePrincipal + repayInterest;
    payment    = repayTotal / repayMonths;
    totalPaid  = graceTotalPaid + payment * repayMonths;
    extra      = totalPaid - amount;
    // Solve for the rate on the full cash flow stream.
    ear = solveAnnualEffectiveWithGrace(amount, gracePmt, grace, payment, n - grace);

  // ── Reducing balance ─────────────────────────────────────────────────────
  } else {
    if (grace > 0) {
      if (graceType === 'accumulate') {
        effectivePrincipal = amount * Math.pow(1 + rMonthly, grace);
      } else {
        gracePmt           = amount * rMonthly;
        graceTotalPaid     = gracePmt * grace;
      }
    }
    const repayMonths = n - grace;
    payment    = effectivePrincipal * rMonthly * Math.pow(1+rMonthly, repayMonths)
                 / (Math.pow(1+rMonthly, repayMonths) - 1);
    totalPaid  = graceTotalPaid + payment * repayMonths;
    extra      = totalPaid - amount;
    ear        = solveAnnualEffectiveWithGrace(amount, gracePmt, grace, payment, repayMonths);
  }

  const methodLabel = inp.loanType === 'on-principal' ? 'روش سود روی اصل وام' : 'روش سود روی مانده بدهی';
  return {
    payment: payment,
    gracePmt: gracePmt,
    ear: ear,
    totalPaid: totalPaid,
    extra: extra,
    summaryLead: `با ${methodLabel}، نرخ اعلامی <strong>${fmtPct(rateAnn)}</strong> به هزینه واقعی <strong>${fmtPct(ear)}</strong> می‌رسد. اضافه‌پرداخت کل شما <strong>${fmt(extra)}</strong> است.`
  };
}

export default {
  toPersian,
  fmt,
  fmtPct,
  monthlyFromAnnualEffective,
  verdictProfile,
  installment,
  loan
};
