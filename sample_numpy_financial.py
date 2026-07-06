"""
Sample script demonstrating numpy-financial functions
This script shows various financial calculations using numpy-financial
"""

import numpy_financial as npf
import numpy as np

print("=" * 60)
print("NumPy Financial Functions Examples")
print("=" * 60)

# ============================================================================
# 1. PMT - Calculate loan payment
# ============================================================================
print("\n1. Loan Payment Calculation (PMT)")
print("-" * 60)

principal = 200000  # Loan amount
annual_rate = 0.075  # 7.5% annual interest rate
years = 15  # Loan duration

monthly_rate = annual_rate / 12
total_payments = years * 12

# Calculate monthly payment
# Note: principal is negative because it's a cash outflow
monthly_payment = npf.pmt(monthly_rate, total_payments, -principal)

print(f"Loan Amount: ${principal:,.2f}")
print(f"Annual Interest Rate: {annual_rate * 100:.2f}%")
print(f"Loan Term: {years} years")
print(f"Monthly Payment: ${monthly_payment:.2f}")

# ============================================================================
# 2. PV - Present Value
# ============================================================================
print("\n2. Present Value Calculation (PV)")
print("-" * 60)

future_value = 100000  # Amount to receive in the future
annual_rate = 0.05  # 5% discount rate
years = 10  # Number of years

# Calculate present value of a future amount
present_value = npf.pv(annual_rate, years, 0, -future_value)

print(f"Future Value: ${future_value:,.2f}")
print(f"Discount Rate: {annual_rate * 100:.2f}%")
print(f"Years: {years}")
print(f"Present Value: ${present_value:,.2f}")

# ============================================================================
# 3. FV - Future Value
# ============================================================================
print("\n3. Future Value Calculation (FV)")
print("-" * 60)

present_value = 10000  # Initial investment
annual_rate = 0.06  # 6% annual return
years = 20  # Investment period

# Calculate future value
future_value = npf.fv(annual_rate, years, 0, -present_value)

print(f"Initial Investment: ${present_value:,.2f}")
print(f"Annual Return Rate: {annual_rate * 100:.2f}%")
print(f"Investment Period: {years} years")
print(f"Future Value: ${future_value:,.2f}")

# ============================================================================
# 4. NPV - Net Present Value
# ============================================================================
print("\n4. Net Present Value Calculation (NPV)")
print("-" * 60)

initial_investment = -100000  # Initial cash outflow
cash_flows = [30000, 35000, 40000, 45000, 50000]  # Annual cash inflows
discount_rate = 0.08  # 8% discount rate

# Calculate NPV
npv = npf.npv(discount_rate, [initial_investment] + cash_flows)

print(f"Initial Investment: ${abs(initial_investment):,.2f}")
print(f"Cash Flows: {[f'${cf:,.2f}' for cf in cash_flows]}")
print(f"Discount Rate: {discount_rate * 100:.2f}%")
print(f"Net Present Value: ${npv:,.2f}")

if npv > 0:
    print("✓ Project is profitable (NPV > 0)")
else:
    print("✗ Project is not profitable (NPV <= 0)")

# ============================================================================
# 5. IRR - Internal Rate of Return
# ============================================================================
print("\n5. Internal Rate of Return Calculation (IRR)")
print("-" * 60)

cash_flows = [-100000, 30000, 35000, 40000, 45000, 50000]

# Calculate IRR
irr = npf.irr(cash_flows)

print(f"Cash Flows: {[f'${cf:,.2f}' for cf in cash_flows]}")
print(f"Internal Rate of Return: {irr * 100:.2f}%")

# ============================================================================
# 6. RATE - Interest Rate
# ============================================================================
print("\n6. Interest Rate Calculation (RATE)")
print("-" * 60)

nper = 60  # Number of periods (5 years * 12 months)
pmt = -1000  # Monthly payment
pv = 50000  # Present value (loan amount)

# Calculate interest rate
monthly_rate = npf.rate(nper, pmt, pv, 0)
annual_rate = monthly_rate * 12

print(f"Loan Amount: ${pv:,.2f}")
print(f"Monthly Payment: ${abs(pmt):,.2f}")
print(f"Number of Payments: {nper}")
print(f"Monthly Interest Rate: {monthly_rate * 100:.4f}%")
print(f"Annual Interest Rate: {annual_rate * 100:.2f}%")

# ============================================================================
# 7. NPER - Number of Periods
# ============================================================================
print("\n7. Number of Periods Calculation (NPER)")
print("-" * 60)

rate = 0.05 / 12  # Monthly interest rate (5% annual)
pmt = -500  # Monthly payment
pv = 20000  # Loan amount

# Calculate number of periods
nper = npf.nper(rate, pmt, pv, 0)
years = nper / 12

print(f"Loan Amount: ${pv:,.2f}")
print(f"Monthly Payment: ${abs(pmt):,.2f}")
print(f"Monthly Interest Rate: {rate * 100:.4f}%")
print(f"Number of Payments: {nper:.1f}")
print(f"Loan Term: {years:.1f} years")

# ============================================================================
# 8. IPMT and PPMT - Interest and Principal Payment
# ============================================================================
print("\n8. Interest and Principal Payment Breakdown (IPMT & PPMT)")
print("-" * 60)

principal = 100000
annual_rate = 0.06
years = 5
monthly_rate = annual_rate / 12
total_payments = years * 12
monthly_payment = npf.pmt(monthly_rate, total_payments, -principal)

print(f"Loan Amount: ${principal:,.2f}")
print(f"Annual Interest Rate: {annual_rate * 100:.2f}%")
print(f"Loan Term: {years} years")
print(f"Monthly Payment: ${monthly_payment:.2f}\n")

# Show breakdown for first 6 months
print("Payment Schedule (First 6 months):")
print(f"{'Month':<8} {'Payment':<12} {'Interest':<12} {'Principal':<12} {'Balance':<12}")
print("-" * 60)

balance = principal
for month in range(1, 7):
    interest_payment = npf.ipmt(monthly_rate, month, total_payments, -principal)
    principal_payment = npf.ppmt(monthly_rate, month, total_payments, -principal)
    balance -= principal_payment
    
    print(f"{month:<8} ${monthly_payment:<11.2f} ${interest_payment:<11.2f} "
          f"${principal_payment:<11.2f} ${balance:<11.2f}")

print("\n" + "=" * 60)
print("Examples completed!")
print("=" * 60)

