# Cashflow Rate Calculator

The Persian-language static calculator ([hesabkesh](https://hesabkesh.ir)) and Python reference examples for loan cashflows, nominal annual rates, EAR, PMT, NPV, PV, FV, and amortization schedules.

## Website and project layout

- `hesabkesh/index.html`: calculator UI, article summaries, expandable full articles and MathML formulas. No build step.
- `hesabkesh/calc.js`: shared browser/nginx njs calculation code. Installment schedules use bisection; bank-loan cashflows use Newton-style iteration.
- `hesabkesh/og.js` and `hesabkesh/pages.js`: server-rendered landing pages and link previews. See `hesabkesh.nginx.conf` for nginx with njs.
- `test.py`: fixed monthly installments, with `k` zero-payment months before `n` installments.
- `test2.py`: configurable monthly cashflows; the default is 100 million received and twelve payments of 10 million.
- `test3.py`: two zero-payment months, four payments, then principal repayment in month seven.
- `sample_numpy_financial.py`: examples of the financial library functions.
- `main.py`: placeholder entry point; run the examples directly.

The `test*.py` files are runnable demonstrations, not an automated test suite.

Run the static site from the repository root:

```bash
python3 -m http.server 8000 --directory hesabkesh
```

Open `http://localhost:8000/index.html`. Articles are at `?tab=articles`; the effective-rate article is at `#article-effective-rate`. Landing routes and generated social previews require nginx with njs.

To add an article, follow [the article instructions](hesabkesh/AGENTS.md#adding-articles).

---

## Table of Contents

1. [Cashflow Sign Convention](#cashflow-sign-convention)
2. [IRR — Internal Rate of Return](#1-irr--internal-rate-of-return)
3. [APR — Nominal Annual Rate](#2-apr--nominal-annual-rate)
4. [EAR — Effective Annual Rate](#3-ear--effective-annual-rate)
5. [PMT — Fixed Installment](#4-pmt--fixed-installment)
6. [PV — Present Value](#5-pv--present-value)
7. [FV — Future Value](#6-fv--future-value)
8. [NPV — Net Present Value](#7-npv--net-present-value)
9. [NPER — Number of Periods](#8-nper--number-of-periods)
10. [IPMT & PPMT — Amortization Breakdown](#9-ipmt--ppmt--amortization-breakdown)
11. [Grace Period](#10-grace-period)
12. [Usage](#usage)

---

## Cashflow Sign Convention

All calculations follow the standard financial sign convention:

| Value | Meaning |
|-------|---------|
| **Positive** | Cash **received** (inflow) — e.g. loan disbursement |
| **Negative** | Cash **paid** (outflow) — e.g. installments, principal repayment |

**Example cashflow array:**

```
[800_000_000,  0,  0,  -31_900_000,  -31_900_000,  -31_900_000,  -31_900_000,  -800_000_000]
      ↑         ↑   ↑        ↑              ↑              ↑              ↑              ↑
  Loan recv  Grace Grace  Install 1      Install 2      Install 3      Install 4   Principal repayment
  (month 0)  mo.1  mo.2   (month 3)      (month 4)      (month 5)      (month 6)    (month 7)
```

---

## 1. IRR — Internal Rate of Return

$$\sum_{t=0}^{n} \frac{CF_t}{(1 + r)^t} = 0$$

IRR is the monthly rate `r` that makes the **Net Present Value of all cashflows equal to zero**. For general payment schedules it is found numerically; simple special cases can have direct solutions.

| Parameter | Description |
|-----------|-------------|
| $CF_t$ | Cashflow at period $t$ (positive = received, negative = paid) |
| $t$ | Period index (0 = today, 1 = next month, …) |
| $n$ | Total number of periods |
| $r$ | Monthly IRR — the unknown being solved for |

```python
monthly_rate = npf.irr([800_000_000, 0, 0, -31_900_000, -31_900_000, -31_900_000, -31_900_000, -800_000_000])
```

> `npf.irr` assumes equally spaced periods: one array entry per month in these examples, including zeros for skipped months. Amounts may vary, but arbitrary dates require a dated-cashflow method. Multiple sign changes can produce multiple roots or no usable root. IRR names the quantity being calculated, not a particular solver such as Newton–Raphson.

---

## 2. APR — Nominal Annual Rate

$$\text{APR} = r \times 12$$

Here `APR` denotes simple nominal annualization of the monthly IRR. It is not necessarily the advertised contract rate or a regulatory APR: fee inclusion and legal conventions vary. It does **not** account for compounding.

| Parameter | Description |
|-----------|-------------|
| $r$ | Monthly interest rate (from IRR) |
| $12$ | Months per year |
| $\text{APR}$ | Nominal Annual Percentage Rate |

```python
apr = monthly_rate * 12 * 100  # as percentage
```

---

## 3. EAR — Effective Annual Rate

### From monthly IRR

$$\text{EAR} = (1 + r)^{12} - 1$$

### From APR

$$\text{EAR} = \left(1 + \frac{\text{APR}}{12}\right)^{12} - 1$$

EAR is the **true annualized cost** of the loan, accounting for the effect of monthly compounding. For a positive monthly rate, EAR exceeds this nominal annualization. All rates in the formulas are decimals (24% = 0.24). EAR is not inflation-adjusted and is not the total extra payment divided by principal. For example, 100 million received and twelve end-of-month payments of 10 million have EAR ≈ 41.30%, although total extra payment is 20 million.

| Parameter | Description |
|-----------|-------------|
| $r$ | Monthly interest rate |
| $\text{APR}$ | Nominal Annual Percentage Rate |
| $12$ | Compounding periods per year |
| $\text{EAR}$ | Effective Annual Rate — the real yearly cost after compounding |

```python
ear = ((1 + monthly_rate) ** 12 - 1) * 100  # as percentage
```

> **APR vs EAR:** If APR = 24%, the EAR ≈ 26.82% — the difference grows with higher rates and more frequent compounding.

---

## 4. PMT — Fixed Installment

$$\text{PMT} = P \times \frac{r \times (1 + r)^n}{(1 + r)^n - 1}$$

Calculates the **equal end-of-period payment** required to fully repay a loan over `n` periods, with no remaining balance. For zero interest use `PMT = P / n`. Formulas show positive payment magnitudes; NumPy functions use opposing signs for receipts and payments.

| Parameter | Description |
|-----------|-------------|
| $\text{PMT}$ | Payment per period (monthly installment) |
| $P$ | Principal — the initial loan amount |
| $r$ | Periodic (monthly) interest rate |
| $n$ | Total number of payment periods |

```python
monthly_payment = npf.pmt(monthly_rate, n_periods, -principal)
```

**Example:** 800,000,000 Toman loan at monthly rate `r` over 4 months:

$$\text{PMT} = 800{,}000{,}000 \times \frac{r \times (1 + r)^4}{(1 + r)^4 - 1}$$

---

## 5. PV — Present Value

$$\text{PV} = \frac{\text{FV}}{(1 + r)^n}$$

The **value today** of a future amount, discounted at rate `r`.

| Parameter | Description |
|-----------|-------------|
| $\text{PV}$ | Present Value — today's equivalent of a future amount |
| $\text{FV}$ | Future Value — the amount to be received/paid in the future |
| $r$ | Discount rate per period |
| $n$ | Number of periods until the future payment |

```python
present_value = npf.pv(annual_rate, years, 0, -future_value)
```

> If you will receive 100,000 in 10 years and the discount rate is 5%/year, the present value is ≈ 61,391.

---

## 6. FV — Future Value

$$\text{FV} = \text{PV} \times (1 + r)^n$$

The **value in the future** of money invested today at rate `r`.

| Parameter | Description |
|-----------|-------------|
| $\text{FV}$ | Future Value — what the investment grows to |
| $\text{PV}$ | Present Value — the initial amount invested today |
| $r$ | Growth rate per period |
| $n$ | Number of periods |

```python
future_value = npf.fv(annual_rate, years, 0, -present_value)
```

> Investing 10,000 today at 6%/year for 20 years grows to ≈ 32,071.

---

## 7. NPV — Net Present Value

$$\text{NPV} = \sum_{t=0}^{n} \frac{CF_t}{(1 + r)^t}$$

The **total present value** of all future cashflows discounted at rate `r`. A positive NPV means the investment creates value.

| Parameter | Description |
|-----------|-------------|
| $\text{NPV}$ | Net Present Value |
| $CF_t$ | Cashflow at period $t$ (negative for outflows, positive for inflows) |
| $r$ | Discount rate per period |
| $t$ | Period index |
| $n$ | Total number of periods |

```python
npv = npf.npv(discount_rate, [initial_investment] + cash_flows)
```

> **Decision rule:** If NPV > 0, the project is profitable at the given discount rate. If NPV = 0, the discount rate equals the IRR.

---

## 8. NPER — Number of Periods

$$n = \frac{\ln\left(\frac{\text{PMT}}{\text{PMT} - r \times P}\right)}{\ln(1 + r)}$$

Finds **how many payments** are needed for end-of-period repayment with no final balance. For positive `r`, this formula requires `PMT > r × P`; otherwise payments do not reduce principal enough to finish repayment. At zero interest, `n = P / PMT`. A fractional result requires adjusting the final payment.

| Parameter | Description |
|-----------|-------------|
| $n$ | Number of periods (what we're solving for) |
| $\text{PMT}$ | Fixed payment per period |
| $r$ | Periodic interest rate |
| $P$ | Principal (loan amount) |
| $\ln$ | Natural logarithm |

```python
nper = npf.nper(monthly_rate, -monthly_payment, loan_amount)
```

---

## 9. IPMT & PPMT — Amortization Breakdown

For each payment period, the installment is split into:

**Interest portion:**

$$\text{IPMT}_t = \text{Balance}_{t-1} \times r$$

**Principal portion:**

$$\text{PPMT}_t = \text{PMT} - \text{IPMT}_t$$

**Remaining balance:**

$$\text{Balance}_t = \text{Balance}_{t-1} - \text{PPMT}_t$$

| Parameter | Description |
|-----------|-------------|
| $\text{IPMT}_t$ | Interest paid in period $t$ |
| $\text{PPMT}_t$ | Principal repaid in period $t$ |
| $\text{Balance}_{t-1}$ | Outstanding loan balance at start of period $t$ |
| $r$ | Periodic (monthly) interest rate |
| $\text{PMT}$ | Fixed total payment per period |

```python
interest_payment  = npf.ipmt(monthly_rate, month, total_periods, -principal)
principal_payment = npf.ppmt(monthly_rate, month, total_periods, -principal)
```

**Sample amortization table (first 3 months of a 100,000 loan at 6%/year):**

| Month | Payment | Interest | Principal | Balance |
|-------|---------|----------|-----------|---------|
| 1 | 1,933 | 500 | 1,433 | 98,567 |
| 2 | 1,933 | 493 | 1,440 | 97,127 |
| 3 | 1,933 | 486 | 1,447 | 95,680 |

> With a positive fixed rate, the interest portion decreases as the balance falls. Early payments are not necessarily mostly interest; in this example they are already mostly principal.

---

## 10. Grace Period

A grace period delays principal repayment. A no-payment grace period is represented by zeros; an interest-only grace period must contain the actual interest payments. In `test.py`, `k` adds zero-payment months before the `n` installments; total duration is `k + n` months.

```
cashflow = [PV, 0, 0, -PMT, -PMT, ..., -PMT]
              ↑  ←grace→  ←── installments ──→
```

Zeros only record timing; they do not automatically add accrued interest. Holding the initial receipt and subsequent payment amounts fixed, delaying positive repayments lowers a positive IRR. If the contract capitalizes interest, increase the later payments or final balance according to its terms before solving. With consistent compounding, a longer grace period need not change EAR even when total interest grows.

---

## Usage

```bash
# Install dependencies
uv sync

# Run individual scripts
uv run test3.py          # Monthly IRR, nominal annual rate and EAR
uv run test.py           # Loan with fixed installments and grace period
uv run test2.py          # Custom monthly payment schedule
uv run sample_numpy_financial.py  # Full demo of all numpy_financial functions
```

### Example Output (`test3.py`)

```
Monthly rate (IRR): 0.022518 (2.2518%)
Calculated nominal annual rate: 27.02%
Effective annual rate (EAR): 30.63%
```

---

## Requirements

- Python 3.14+ (as specified in `pyproject.toml` and `.python-version`)
- `numpy_financial`
- `numpy`

Install with:

```bash
uv sync
```

---

## Credits

This project has been iterated with AI assistance from Claude and OpenAI Codex.
