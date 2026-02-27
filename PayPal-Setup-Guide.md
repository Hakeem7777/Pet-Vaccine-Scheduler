# PayPal Setup Guide for PetVaxCalendar.com

This guide walks you through creating a PayPal Business account and getting the credentials we need to enable payments on your site.

There are **two rounds** of setup - first for **testing** (sandbox), then for **going live**.

---

## What We Need From You

By the end of this guide, you'll send us **5 items** (for each environment):

| # | Item | Example |
|---|------|---------|
| 1 | Client ID | `AaBbCcDdEeFf1234567890GgHhIiJjKkLlMmNnOoPpQqRr` |
| 2 | Client Secret | `EE1122aaBBccDD3344ffGGhhII5566jjKKllMM7788nnOO` |
| 3 | Webhook ID | `5HN12345AB678901C` |
| 4 | Subscription Plan ID | `P-5ML12345AB678901C` |
| 5 | Environment | Either **Sandbox** (testing) or **Live** (real payments) |

---

## Part 1: Create a PayPal Developer Account

1. Go to **https://developer.paypal.com** and click **Log In**
2. Sign in with your PayPal Business account
   - If you don't have a PayPal Business account yet, go to **https://www.paypal.com/business** and create one first
3. Once logged in, you'll land on the PayPal Developer Dashboard

---

## Part 2: Sandbox Setup (Testing)

This lets us test payments with fake money before going live.

### Step 2A: Create a Sandbox App

1. In the Developer Dashboard, go to **Apps & Credentials**
2. Make sure **Sandbox** is selected at the top (not "Live")
3. Click **Create App**
4. Enter a name like **PetVaxCalendar** and click **Create App**
5. You'll now see two values:
   - **Client ID** - copy this
   - **Secret** (click "Show") - copy this

> Send us both of these values.

### Step 2B: Create a Webhook

1. On the same app page, scroll down to the **Webhooks** section
2. Click **Add Webhook**
3. Enter this URL:

   ```
   https://petvaxcalendar.com/api/subscriptions/webhook/
   ```

4. Under **Events**, check the following boxes:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
5. Click **Save**
6. After saving, you'll see the webhook listed with a **Webhook ID** - copy this

> Send us the Webhook ID.

### Step 2C: Create a Subscription Plan

1. Go to **https://www.sandbox.paypal.com** and log in with your **sandbox business account**
   - You can find sandbox test accounts under **Sandbox > Accounts** in the Developer Dashboard. Look for the one labeled **Business**. The password is viewable by clicking the three dots (⋯) next to it.
2. Once logged into the sandbox business account, go to **https://www.sandbox.paypal.com/billing/plans**
3. You may need to create a **Product** first:
   - Click **Create Product**
   - Name: **PetVaxCalendar Pro Care Plan**
   - Type: **Service**
   - Save it
4. Then create a **Plan** under that product:
   - Plan name: **Pro Care Plan**
   - Billing cycle: **Every 1 year**
   - Price: **$29.00 USD**
   - Click **Create Plan**
5. Once created, copy the **Plan ID** (it starts with `P-`)

> Send us the Plan ID.

### Step 2D: Sandbox Test Accounts

PayPal automatically creates sandbox test accounts for you:

- Go to **Sandbox > Accounts** in the Developer Dashboard
- You'll see a **Personal (buyer)** account - this is the fake customer you can use to test purchases
- Click the three dots (⋯) next to it to see the email and password

No need to send these to us - they're just for you to test purchases on the site.

---

## Part 3: Live Setup (Real Payments)

Once testing looks good, repeat the process for real payments.

### Step 3A: Create a Live App

1. In the Developer Dashboard, go to **Apps & Credentials**
2. Switch to **Live** at the top
3. Click **Create App**
4. Name it **PetVaxCalendar** and click **Create App**
5. Copy the **Client ID** and **Secret**

> Send us both of these values (clearly labeled as **Live**).

### Step 3B: Create a Live Webhook

1. On the same live app page, scroll down to **Webhooks**
2. Click **Add Webhook**
3. Enter the same URL:

   ```
   https://petvaxcalendar.com/api/subscriptions/webhook/
   ```

4. Select the same 5 events as before:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
5. Click **Save** and copy the **Webhook ID**

> Send us this Webhook ID (clearly labeled as **Live**).

### Step 3C: Create a Live Subscription Plan

1. Log into your real PayPal Business account at **https://www.paypal.com**
2. Go to **https://www.paypal.com/billing/plans**
3. Create a **Product**:
   - Name: **PetVaxCalendar Pro Care Plan**
   - Type: **Service**
4. Create a **Plan** under that product:
   - Plan name: **Pro Care Plan**
   - Billing cycle: **Every 1 year**
   - Price: **$29.00 USD**
5. Copy the **Plan ID** (starts with `P-`)

> Send us this Plan ID (clearly labeled as **Live**).

---

## Sending Us Your Credentials

Please send all credentials **securely** (not in plain email). We recommend using **https://onetimesecret.com** - paste the values there, set it to expire after 1 view, and send us the link.

Here's a template you can copy, fill out, and send:

```
SANDBOX CREDENTIALS
-------------------
Client ID:        [paste here]
Client Secret:    [paste here]
Webhook ID:       [paste here]
Plan ID (P-...):  [paste here]

LIVE CREDENTIALS
-------------------
Client ID:        [paste here]
Client Secret:    [paste here]
Webhook ID:       [paste here]
Plan ID (P-...):  [paste here]
```


