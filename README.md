# Cashflow Rate Calculator

A Python toolkit for analyzing loan scenarios — computing IRR, APR, EAR, PMT, NPV, PV, FV, and amortization schedules using `numpy_financial`.

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

IRR is the monthly rate `r` that makes the **Net Present Value of all cashflows equal to zero**. It is solved numerically — there is no closed-form solution.

| Parameter | Description |
|-----------|-------------|
| $CF_t$ | Cashflow at period $t$ (positive = received, negative = paid) |
| $t$ | Period index (0 = today, 1 = next month, …) |
| $n$ | Total number of periods |
| $r$ | Monthly IRR — the unknown being solved for |

```python
monthly_rate = npf.irr([800_000_000, 0, 0, -31_900_000, -31_900_000, -31_900_000, -31_900_000, -800_000_000])
```

> IRR is the most accurate way to find the true cost of a loan from any cashflow structure, including grace periods and irregular payments.

---

## 2. APR — Nominal Annual Rate

$$\text{APR} = r \times 12$$

A simple annualization of the monthly rate — the figure typically stated in loan contracts. It does **not** account for compounding.

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

EAR is the **true annualized cost** of the loan, accounting for the effect of monthly compounding. It is always higher than APR (except when $r = 0$).

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

Calculates the **equal periodic payment** required to fully repay a loan (principal + interest) over `n` periods.

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

Finds **how many payments** are needed to fully repay a loan given a fixed payment amount.

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

> Early payments are mostly interest; later payments shift toward principal repayment.

---

## 10. Grace Period

A grace period (تنفس) is a set of months at the beginning of a loan during which **no payments are made**. It is modeled as zeros in the cashflow array.

```
cashflow = [PV, 0, 0, -PMT, -PMT, ..., -PMT]
              ↑  ←grace→  ←── installments ──→
```

The effect of a grace period is that **interest accrues** during the silent months, raising the effective cost of the loan. A longer grace period results in a higher EAR for the same stated APR.

---

## Usage

```bash
# Install dependencies
uv sync

# Run individual scripts
uv run test3.py          # IRR/APR/EAR for a specific loan scenario
uv run test.py           # Loan with fixed installments and grace period
uv run test2.py          # Custom monthly payment schedule
uv run sample_numpy_financial.py  # Full demo of all numpy_financial functions
```

### Example Output (`test3.py`)

```
نرخ سود ماهانه (IRR)     : 0.022518  (2.2518٪)
نرخ اسمی سالانه (APR)     : 27.02٪
نرخ موثر سالانه (EAR)     : 30.63٪
```

---

## Requirements

- Python 3.8+
- `numpy_financial`
- `numpy`

Install with:

```bash
uv sync
```
