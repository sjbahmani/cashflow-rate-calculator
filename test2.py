import math

import numpy_financial as npf

# Loan received at month zero, in toman (positive inflow).
loan_amount = 100_000_000

# End-of-month payments in toman; keep zeros for months without payments.
monthly_payments = [
    -10_000_000,  # Month 1
    -10_000_000,  # Month 2
    -10_000_000,  # Month 3
    -10_000_000,  # Month 4
    -10_000_000,  # Month 5
    -10_000_000,  # Month 6
    -10_000_000,  # Month 7
    -10_000_000,  # Month 8
    -10_000_000,  # Month 9
    -10_000_000,  # Month 10
    -10_000_000,  # Month 11
    -10_000_000,  # Month 12
]

# Initial receipt followed by twelve monthly repayments.
cash_flow = [loan_amount] + monthly_payments

# Find the monthly rate that makes the cashflows' net present value zero.
monthly_rate = npf.irr(cash_flow)
if not math.isfinite(monthly_rate) or monthly_rate <= -1:
    raise ValueError("No usable rate was found for these cashflows.")

# Nominal annualization and effective annualization with compounding.
nominal_rate = monthly_rate * 12
effective_rate = (1 + monthly_rate) ** 12 - 1

print("-" * 40)
print(f"Loan amount (toman): {loan_amount:,.0f}")
print(f"Total repayments (toman): {-sum(monthly_payments):,.0f}")
print(f"Total months: {len(monthly_payments)}")
print("-" * 40)
print("Rate analysis:")
print(f"Monthly rate: {monthly_rate * 100:.4f}%")
print(f"Calculated nominal annual rate: {nominal_rate * 100:.2f}%")
print(f"Effective annual rate (EAR): {effective_rate * 100:.2f}%")
print("-" * 40)

# Display the timing and sign of each cashflow.
print("Cashflow schedule (toman):")
for i, cash in enumerate(cash_flow):
    month_name = "Loan received" if i == 0 else f"Month {i}"
    print(f"{month_name}: {cash:,.0f}")
