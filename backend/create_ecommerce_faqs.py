import csv

companies = ['Amazon', 'Flipkart', 'Myntra']
categories = ['Accounts', 'Billing', 'Technical Support', 'Shipping & Delivery', 'Returns & Refunds', 'Discounts & Offers', 'Product Quality', 'General']

base_questions = [
    # Shipping & Delivery (9)
    ("Where is my order?", "You can track your order in the 'Orders' section of your {company} account."),
    ("How long does shipping take?", "Standard shipping takes 3-5 business days. Expedited options are available at checkout."),
    ("Can I change my delivery address?", "Yes, you can update your address before the item ships from the 'Orders' page."),
    ("Do you offer international shipping?", "{company} currently serves select international locations. Check our shipping policy for details."),
    ("Why is my delivery delayed?", "Delays can occur due to weather or logistics. Please check the tracking link for updates."),
    ("What happens if I miss my delivery?", "Our delivery partners will usually attempt delivery 3 times before returning the item."),
    ("Can I pick up my order from a store?", "Depending on the location, {company} offers pickup points. Check availability at checkout."),
    ("How do I contact the delivery agent?", "You will receive the agent's contact details via SMS when the order is out for delivery."),
    ("Is shipping free?", "Free shipping is available on eligible orders or for {company} premium members."),

    # Returns & Refunds (8)
    ("How do I return an item?", "Go to 'Orders', select the item, and click 'Return/Replace'."),
    ("What is your return policy?", "Most items can be returned within 7-30 days of delivery, depending on the product category."),
    ("When will I get my refund?", "Refunds are processed within 5-7 business days after we receive the returned item."),
    ("Can I exchange my item for a different size?", "Yes, you can request an exchange for apparel and footwear if the size is available."),
    ("Do I have to pay for return shipping?", "Return shipping is generally free for eligible items on {company}."),
    ("My item arrived damaged. What do I do?", "Please initiate a return immediately and upload photos of the damage."),
    ("Why was my return rejected?", "Returns may be rejected if tags are missing or the item appears used. Contact support for details."),
    ("How do I get a refund for a cancelled order?", "Refunds for cancelled orders are processed automatically to your original payment method."),

    # Accounts & Security (8)
    ("How do I change my password?", "Go to settings > security and click 'change password'."),
    ("How do I close my account?", "Navigate to account settings, select 'Deactivate Account', and follow the prompts."),
    ("Is my credit card information secure?", "Yes, {company} uses industry-standard encryption for all transactions."),
    ("How do I update my email address?", "Go to 'Personal Details' in your account settings."),
    ("Can I share my account with family?", "You can add multiple addresses, but sharing login details is discouraged for security reasons."),
    ("What do I do if my account is hacked?", "Reset your password immediately and contact {company} customer support."),
    ("How do I unsubscribe from marketing emails?", "Click the 'unsubscribe' link at the bottom of any promotional email."),
    ("How do I enable two-factor authentication?", "Go to 'Login & Security' settings to enable 2FA for your account."),

    # Billing & Payments (7)
    ("Where can I find my invoice?", "Invoices are available under the 'Orders' or 'Billing' section of your profile."),
    ("What payment methods do you accept?", "We accept Credit/Debit cards, Net Banking, UPI, and select Digital Wallets."),
    ("Why did my payment fail?", "This usually happens due to insufficient funds, bank server issues, or an expired card."),
    ("Can I pay cash on delivery?", "Yes, Cash on Delivery (COD) is available for many locations and products."),
    ("How do I use my wallet balance?", "You can select your {company} wallet balance as a payment method during checkout."),
    ("Are there any hidden charges?", "No, the final amount shown at checkout includes all taxes and shipping fees."),
    ("My bank account was debited but the order failed.", "The amount will be naturally auto-refunded by your bank within 3-5 business days."),

    # Discounts & Offers (4)
    ("How do I apply a promo code?", "Enter the promo code in the 'Apply Coupon' field during checkout."),
    ("Why is my coupon not working?", "Coupons may have expired or may not be applicable to the items in your cart."),
    ("Do you have a loyalty program?", "Yes, join our premium membership for exclusive discounts and free shipping."),
    ("Are bank offers available?", "Bank-specific discounts are listed on the product page and applied at checkout."),
]

faqs = []
idx = 0

# 34 questions * 3 companies = 102 FAQs total.
for comp in companies:
    for q, a in base_questions:
        # Determine a reasonable category
        if "delivery" in q.lower() or "shipping" in q.lower():
            cat = "Shipping & Delivery"
        elif "return" in q.lower() or "refund" in q.lower() or "exchange" in q.lower():
            cat = "Returns & Refunds"
        elif "password" in q.lower() or "account" in q.lower() or "email" in q.lower():
            cat = "Accounts"
        elif "payment" in q.lower() or "invoice" in q.lower() or "debited" in q.lower():
            cat = "Billing"
        elif "coupon" in q.lower() or "promo" in q.lower() or "discount" in q.lower():
            cat = "Discounts & Offers"
        else:
            cat = categories[idx % len(categories)]
            
        faqs.append({
            "question": f"[{comp}] {q}",
            "answer": a.format(company=comp),
            "company": comp,
            "category": cat,
            "tags": f"{comp.lower()},{cat.lower().replace(' ', '').replace('&', 'and')}"
        })
        idx += 1

with open('dummy_102_faqs.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["question", "answer", "company", "category", "tags"])
    writer.writeheader()
    writer.writerows(faqs)

print(f"Generated {len(faqs)} FAQs in dummy_102_faqs.csv")
