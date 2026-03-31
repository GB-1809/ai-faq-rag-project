import csv

companies = ['Amazon', 'Microsoft', 'Google', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Spotify', 'Uber', 'Airbnb']
categories = ['Accounts', 'Billing', 'Technical Support', 'Shipping & Delivery', 'General']

base_questions = [
    ("How do I change my password?", "Go to settings > security and click 'change password'."),
    ("Where can I find my invoice?", "Invoices are available under the 'Billing' section of your profile."),
    ("How do I contact support?", "You can reach us at support@{company}.com or call 1-800-123-4567."),
    ("Can I get a refund?", "Refunds are processed within 5-7 business days if applicable."),
    ("How do I close my account?", "Navigate to account settings and select 'Deactivate Account'."),
    ("What payment methods do you accept?", "We accept Visa, Mastercard, AMEX, and PayPal."),
    ("Is there a mobile app?", "Yes, you can download the {company} app from iOS and Android stores."),
    ("How do I update my email address?", "Go to 'Personal Details' in your account settings."),
    ("Why did my payment fail?", "This usually happens due to insufficient funds or expired cards."),
    ("Can I share my account?", "Account sharing policies vary. Please check the Terms of Service.")
]

faqs = []
idx = 0
for comp in companies:
    # 10 questions per company = 100 total
    for q, a in base_questions:
        cat = categories[idx % len(categories)]
        faqs.append({
            "question": f"[{comp}] {q}",
            "answer": a.format(company=comp.lower()),
            "company": comp,
            "category": cat,
            "tags": f"{comp.lower()},{cat.lower().replace(' ', '')}"
        })
        idx += 1

with open('dummy_100_faqs.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["question", "answer", "company", "category", "tags"])
    writer.writeheader()
    writer.writerows(faqs)

print(f"Generated {len(faqs)} FAQs in dummy_100_faqs.csv")
