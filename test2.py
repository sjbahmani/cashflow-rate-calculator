import numpy_financial as npf

# --- ۱. تعریف ورودی‌ها ---
loan_amount = 100_000_000   # پولی که دریافت می‌کنید (مثبت)

# لیست پرداخت‌ها به ترتیب ماه
# (هر عدد نشان‌دهنده پرداخت در آن ماه است)
monthly_payments = [
    -10_000_000,    # 1
    -10_000_000,    # 2
    -10_000_000,    # ماه ۳
    -10_000_000,    # ماه ۴
    -10_000_000,    # ماه ۵
    -10_000_000,    # ماه ۶
    -10_000_000,    # ماه ۷
    -10_000_000,    # ماه ۸
    -10_000_000,    # ماه ۹
    -10_000_000,    # ماه ۱۰
    -10_000_000,    # ماه ۱۱
    -10_000_000,    # ماه ۱۲
]

# --- ۲. ساخت جریان نقدی کلی ---
# لیست نهایی می‌شود: [100, 0, -2, -2, -15, -15, -10, -70]
cash_flow = [loan_amount] + monthly_payments

# --- ۳. محاسبه نرخ واقعی (IRR) ---
# تابع irr نرخ سودی را پیدا می‌کند که ارزش این پول‌ها را به ۱۰۰ امروز برساند
monthly_rate = npf.irr(cash_flow)

# --- ۴. تبدیل به نرخ‌های سالیانه ---
nominal_rate = monthly_rate * 12
effective_rate = (1 + monthly_rate) ** 12 - 1

# --- ۵. نمایش خروجی ---
print("-" * 40)
print(f"مبلغ وام: {loan_amount:,.0f}")
print(f"مجموع بازپرداخت شما: {sum(monthly_payments)*-1:,.0f}")
print(f"تعداد کل ماه‌ها: {len(monthly_payments)}")
print("-" * 40)
print("تحلیل سود:")
print(f"نرخ سود ماهانه:      {monthly_rate * 100:.4f} %")
print(f"نرخ اسمی (بانکی):    {nominal_rate * 100:.2f} %")
print(f"نرخ موثر (EAR):      {effective_rate * 100:.2f} %")
print("-" * 40)

# نمایش لیست جریان نقدی برای درک بهتر
print("جدول جریان نقدی:")
for i, cash in enumerate(cash_flow):
    month_name = "دریافت وام" if i == 0 else f"ماه {i}"
    print(f"{month_name}: {cash:,.0f}")