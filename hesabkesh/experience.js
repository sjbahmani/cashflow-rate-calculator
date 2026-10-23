/* Calculator interaction and validation; financial formulas live in calc.js. */
// Keep purchases and known-payment loans independent on their first visit.
const installmentDrafts = { purchase: null, loan: null };
const installmentInputIds = ['inst-cash', 'inst-payment', 'inst-n', 'inst-store-value', 'inst-store-n', 'inst-down', 'inst-payments-var'];
function captureInstallmentDraft() {
  return {
    values: Object.fromEntries(installmentInputIds.map(id => [id, document.getElementById(id).value])),
    entry: instEntryMode,
    variable: instVariableMode,
    storeKind: document.getElementById('inst-store-kind').value,
    firstNow: instFirstPaymentNow,
    downOpen: document.getElementById('inst-down-panel').classList.contains('open')
  };
}
function restoreInstallmentDraft(draft) {
  resetInstallmentForm();
  if (!draft) return;
  setStoreKind(draft.storeKind);
  setInstallmentEntryMode(draft.entry);
  if (draft.variable !== instVariableMode) toggleVariable();
  setFirstPaymentTiming(draft.firstNow);
  setInstallmentDownVisibility(draft.downOpen);
  installmentInputIds.forEach(id => { document.getElementById(id).value = draft.values[id]; });
  updateVarCounter();
  updateStoreDerived();
}

function preferredScrollBehavior() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
function refreshAccessibility() {
  const descriptions = {
    'inst-cash': 'inst-kind-help',
    'inst-payment': 'inst-entry-help',
    'inst-store-value': 'inst-entry-help',
    'inst-store-n': 'inst-entry-help',
    'inst-payments-var': 'inst-var-counter',
    'inst-first-now': 'inst-first-help',
    'inst-first-next': 'inst-first-help',
    'loan-type-principal': 'loan-method-help',
    'loan-type-balance': 'loan-method-help'
  };
  Object.entries(descriptions).forEach(([id, description]) => {
    const control = document.getElementById(id);
    const ids = new Set((control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    ids.add(description);
    control.setAttribute('aria-describedby', [...ids].join(' '));
  });
  const down = document.getElementById('inst-down');
  const downIds = new Set((down.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
  if (instKind === 'loan') downIds.add('inst-down-help'); else downIds.delete('inst-down-help');
  if (downIds.size) down.setAttribute('aria-describedby', [...downIds].join(' ')); else down.removeAttribute('aria-describedby');
  const required = ['inst-cash', 'inst-payment', 'inst-n', 'inst-store-value', 'inst-store-n', 'inst-payments-var', 'loan-amount', 'loan-rate', 'loan-n'];
  required.forEach(id => {
    const input = document.getElementById(id);
    if (input.getClientRects().length) input.setAttribute('aria-required', 'true');
    else input.removeAttribute('aria-required');
  });
}
function returnToCalculator() {
  switchTab(lastCalculatorTab);
  document.querySelector('.calculator-modes').scrollIntoView({ block: 'start', behavior: preferredScrollBehavior() });
}
function clearSelectedExample(prefix) {
  const group = prefix === 'loan' ? document.querySelector('#panel-loan .presets')
    : document.getElementById('inst-presets-' + (instKind === 'loan' ? 'loan' : 'purchase'));
  group.querySelectorAll('.preset-btn').forEach(button => {
    button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false');
  });
}
function invalidateReceipt(prefix) {
  clearSelectedExample(prefix);
  if (prefix === 'inst') resetInstallmentResult(); else resetLoanResult();
  if (window.refreshMobileAction) refreshMobileAction();
}
function errorField(prefix) {
  if (prefix === 'loan') {
    if (!v('loan-amount')) return 'loan-amount';
    const rate = document.getElementById('loan-rate').value;
    if (!rate || v('loan-rate') < 0 || v('loan-rate') > 300) return 'loan-rate';
    const months = v('loan-n');
    if (months < 1 || months > 360 || Math.floor(months) !== months) return 'loan-n';
    return 'loan-grace';
  }
  if (!v('inst-cash')) return 'inst-cash';
  if (v('inst-down') >= v('inst-cash')) return 'inst-down';
  if (instEntryMode === 'store') {
    const months = v('inst-store-n');
    if (months < 1 || months > 360 || Math.floor(months) !== months) return 'inst-store-n';
    return 'inst-store-value';
  }
  if (instVariableMode) return 'inst-payments-var';
  const months = v('inst-n');
  if (months < 1 || months > 360 || Math.floor(months) !== months) return 'inst-n';
  return 'inst-payment';
}
function validateRequired(prefix) {
  const ids = prefix === 'loan' ? ['loan-amount', 'loan-rate', 'loan-n']
    : ['inst-cash'].concat(instEntryMode === 'store' ? ['inst-store-value', 'inst-store-n']
      : instVariableMode ? ['inst-payments-var'] : ['inst-payment', 'inst-n']);
  const missing = ids.find(id => !document.getElementById(id).value.trim());
  if (!missing) return true;
  const input = document.getElementById(missing);
  const message = 'این بخش را تکمیل کنید.';
  const el = document.getElementById(prefix + '-error');
  el.textContent = message; el.classList.add('show');
  const error = document.createElement('p'); error.id = missing + '-field-error';
  error.className = 'inline-field-error'; error.textContent = message;
  input.after(error); input.classList.add('invalid'); input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
  if (!restoringState) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: 'center', behavior: preferredScrollBehavior() }); }
  return false;
}
function revealCalculatedResult(prefix) {
  if (!restoringState && matchMedia('(max-width: 680px)').matches) {
    requestAnimationFrame(() => {
      const result = document.getElementById(prefix + '-result');
      result.tabIndex = -1;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
    });
  }
  if (window.refreshMobileAction) refreshMobileAction();
}
function refreshMobileAction() {
  const action = document.getElementById('mobile-calc-action');
  if (!action) return;
  const panel = document.querySelector('.calculator-panel.active');
  if (!panel || !matchMedia('(max-width: 680px)').matches) { action.hidden = true; return; }
  const button = panel.querySelector('.btn');
  const rect = button.getBoundingClientRect();
  const prefix = panel.id === 'panel-loan' ? 'loan' : 'inst';
  action.hidden = Boolean(receiptStates[prefix]) || (rect.top >= 0 && rect.bottom <= innerHeight);
}
document.addEventListener('DOMContentLoaded', () => {
  refreshAccessibility();
  document.querySelectorAll('.preset-btn').forEach(button => button.setAttribute('aria-pressed', 'false'));
  for (const [prefix, panelId] of [['inst', 'panel-installment'], ['loan', 'panel-loan']]) {
    const panel = document.getElementById(panelId);
    panel.addEventListener('click', event => {
      const example = event.target.closest('.preset-btn');
      if (example) {
        clearSelectedExample(prefix);
        example.classList.add('selected'); example.setAttribute('aria-pressed', 'true');
      } else if (event.target.closest('.choice-btn,.grace-toggle,.reset-btn')) {
        clearSelectedExample(prefix);
      }
    });
    for (const type of ['input', 'change']) panel.addEventListener(type, event => {
      if (!event.target.matches('input,select,textarea')) return;
      invalidateReceipt(prefix);
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input')) {
        event.preventDefault(); panel.querySelector('.btn').click();
      }
    });
  }
  const action = document.createElement('button');
  action.type = 'button'; action.id = 'mobile-calc-action'; action.hidden = true;
  action.textContent = 'محاسبهٔ نتیجه ↓';
  action.addEventListener('click', () => document.querySelector('.calculator-panel.active .btn').click());
  document.body.append(action);
  const observer = new IntersectionObserver(refreshMobileAction);
  document.querySelectorAll('.calculator-panel .btn').forEach(button => observer.observe(button));
  window.addEventListener('resize', refreshMobileAction);
  document.addEventListener('click', refreshMobileAction);
  refreshMobileAction();
});
