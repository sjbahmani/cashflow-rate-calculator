import math

import numpy_financial as npf

# Inputs: all amounts are in toman, and each period is one month.
PV = 78_600_000  # Loan received at month zero (positive inflow).
PMT = -5_237_300  # Monthly installment (negative outflow).
n = 24  # Number of installments after the grace period.
k = 0  # Number of zero-payment grace months.

# Include each grace month; the first installment is at the end of month k+1.
if not isinstance(k, int) or k < 0:
    raise ValueError("Grace months must be a nonnegative integer.")
cash_flow = [PV] + [0] * k + [PMT] * n

# Find the monthly rate that makes the cashflows' net present value zero.
monthly_rate = npf.irr(cash_flow)
if not math.isfinite(monthly_rate) or monthly_rate <= -1:
    raise ValueError("No usable rate was found for these cashflows.")

# Simple annualization; not necessarily the advertised contract rate.
nominal_annual_rate = monthly_rate * 12

# Annualized cost including compounding, without adjusting for inflation.
effective_annual_rate = (1 + monthly_rate) ** 12 - 1

print("-" * 40)
print(f"Loan amount (toman): {PV:,.0f}")
print(f"Installment cashflow (toman): {PMT:,.0f}")
print(f"Installments: {n} | Grace months: {k}")
print("-" * 40)
print(f"Monthly rate (r): {monthly_rate * 100:.4f}%")
print(f"Calculated nominal annual rate: {nominal_annual_rate * 100:.2f}%")
print(f"Effective annual rate (EAR): {effective_annual_rate * 100:.2f}%")
print("-" * 40)
