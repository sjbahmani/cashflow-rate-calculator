import math

import numpy_financial as npf

# Monthly cashflows in toman:
# Month 0: receive 800,000,000.
# Months 1-2: no payments during the grace period.
# Months 3-6: pay 31,900,000 each month.
# Month 7: repay the 800,000,000 principal.
cashflows = [
    800_000_000, 0, 0,
    -31_900_000, -31_900_000, -31_900_000, -31_900_000,
    -800_000_000,
]

# Calculate monthly IRR from equally spaced cashflows.
monthly_rate = npf.irr(cashflows)
if not math.isfinite(monthly_rate) or monthly_rate <= -1:
    raise ValueError("No usable rate was found for these cashflows.")

nominal_annual_rate = monthly_rate * 12 * 100  # Percentage, without compounding.
ear = ((1 + monthly_rate) ** 12 - 1) * 100  # Effective annual percentage.

print(f"Monthly rate (IRR): {monthly_rate:.6f} ({monthly_rate * 100:.4f}%)")
print(f"Calculated nominal annual rate: {nominal_annual_rate:.2f}%")
print(f"Effective annual rate (EAR): {ear:.2f}%")
