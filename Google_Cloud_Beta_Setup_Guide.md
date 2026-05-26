# FintLer — Google Cloud Console Setup Guide (Beta)
## Gmail OAuth Integration for Bank Email Transaction Capture

**When to use this guide:** You are ready to enable the Email Transaction Capture feature.
This guide takes you from a blank Google Cloud account to a working OAuth consent screen with
`gmail.readonly` access — scoped to your beta test users.

> [!IMPORTANT]
> During **Beta**, Google restricts sensitive OAuth scopes (like `gmail.readonly`) to a
> maximum of **100 test users** without a full app verification. This is perfectly fine for your
> MVP launch. Full verification is a separate step done before public launch.

**Estimated time:** 30–45 minutes
**Prerequisites:** A Google account (your product/company Google account, not personal)

---

## PHASE 1 — Create Your Google Cloud Project

### Step 1: Open Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your **FintLer product Google account** (e.g., `hello@fintler.in`)
3. If this is your first time, accept the Terms of Service

### Step 2: Create a New Project
1. In the top navigation bar, click the **project selector dropdown** (next to the Google Cloud logo)
2. Click **"New Project"**
3. Fill in:
   - **Project name:** `FintLer MVP`
   - **Project ID:** `fintler-mvp` *(auto-generated, but you can customize — it cannot be changed later)*
   - **Organization:** Leave as-is (or select your org if you have one)
4. Click **"Create"**
5. Wait ~30 seconds. Then make sure `FintLer MVP` is selected as the active project in the top bar.

---

## PHASE 2 — Enable the Gmail API

### Step 3: Enable Gmail API
1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for **"Gmail API"**
3. Click on it → Click **"Enable"**
4. Wait for it to activate (you'll be redirected to the Gmail API overview page)

> You should also enable **"Cloud Pub/Sub API"** now — this is needed for real-time email push
> notifications (when a new bank alert email arrives, Pub/Sub will notify FintLer instantly).
5. Go back to **Library** → search **"Cloud Pub/Sub API"** → Click **"Enable"**

---

## PHASE 3 — Configure the OAuth Consent Screen

This is the screen users will see when they click "Connect Gmail" in FintLer.
**This is the most important step — configure it carefully.**

### Step 4: Open the OAuth Consent Screen
1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Under **"User Type"**, select **"External"**
   - *(External = allows any Google account user, not just people in your org)*
3. Click **"Create"**

### Step 5: Fill in App Information (Page 1 of 4)

| Field | Value |
| :--- | :--- |
| **App name** | `FintLer` |
| **User support email** | `support@fintler.in` *(or your support email)* |
| **App logo** | Upload your FintLer logo (PNG, max 1MB) |
| **App domain** | `https://fintler.netlify.app` *(your Netlify URL, update when you have a custom domain)* |
| **Authorized domains** | `netlify.app` and `fintler.in` *(add both)* |
| **Developer contact email** | `dev@fintler.in` *(or your email)* |

Click **"Save and Continue"**

### Step 6: Add Scopes (Page 2 of 4)

> [!WARNING]
> This is where you define EXACTLY what FintLer can access in the user's Google account.
> Add ONLY the minimum required scope. Never add more than you need.

1. Click **"Add or Remove Scopes"**
2. In the **"Manually add scopes"** text box at the bottom, paste:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   ```
3. Click **"Add to Table"**
4. You should now see it listed as a **"Sensitive scope"** — this is expected.
5. Click **"Update"**
6. Click **"Save and Continue"**

**What this scope allows:**
- ✅ FintLer can READ emails in the user's Gmail inbox
- ❌ FintLer CANNOT send emails
- ❌ FintLer CANNOT delete emails
- ❌ FintLer CANNOT modify labels or settings

### Step 7: Add Test Users (Page 3 of 4) — **Beta Critical Step**

> [!IMPORTANT]
> While your app is in **"Testing"** (unpublished) mode, ONLY users explicitly added here
> can use the Gmail OAuth flow. Maximum **100 test users**.

1. Click **"Add Users"**
2. Add email addresses of your beta testers one by one:
   - Your own Gmail: `yourname@gmail.com`
   - Team members' Gmails
   - Your first 10–50 beta users' Gmails
3. Click **"Add"**
4. Click **"Save and Continue"**

### Step 8: Review Summary (Page 4 of 4)
1. Review all the information
2. Click **"Back to Dashboard"**

> Your app status is now **"Testing"** — this is correct for Beta.

---

## PHASE 4 — Create OAuth 2.0 Credentials

### Step 9: Create OAuth Client ID
1. Go to **"APIs & Services" → "Credentials"**
2. Click **"+ Create Credentials"** → Select **"OAuth client ID"**
3. Fill in:
   - **Application type:** `Web application`
   - **Name:** `FintLer Web Client`
   - **Authorized JavaScript origins:**
     ```
     https://fintler.netlify.app
     http://localhost:3000
     ```
   - **Authorized redirect URIs:**
     ```
     https://fintler.netlify.app/auth/callback/google
     https://lyyymymdbxpxxtrsilpa.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback/google
     ```
     > Replace `lyyymymdbxpxxtrsilpa` with your actual Supabase project ID.
4. Click **"Create"**

### Step 10: Save Your Credentials
A popup will show your credentials. **Copy and save these immediately:**

```
Client ID:      XXXXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
Client Secret:  GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> [!CAUTION]
> NEVER commit these to GitHub or hardcode them in your frontend code.
> Store them as Supabase secrets only.

---

## PHASE 5 — Configure Supabase with Google OAuth

### Step 11: Add Google as an Auth Provider in Supabase
1. Go to your Supabase Dashboard → [Authentication → Providers](https://supabase.com/dashboard/project/lyyymymdbxpxxtrsilpa/auth/providers)
2. Scroll to **"Google"** and toggle it **ON**
3. Paste your credentials:
   - **Client ID:** *(from Step 10)*
   - **Client Secret:** *(from Step 10)*
4. **Callback URL** — copy the value shown here (it will look like `https://lyyymymdbxpxxtrsilpa.supabase.co/auth/v1/callback`)
   - Go back to your Google Cloud credentials (Step 9) and make sure this URL is in your **Authorized redirect URIs**
5. Click **"Save"**

### Step 12: Store Gemini & Gmail Secrets in Supabase Vault
1. Go to **Supabase Dashboard → Settings → Edge Functions → Secrets**
2. Add the following secrets:

| Secret Name | Value | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIza...` | AI parsing + insight generation |
| `GOOGLE_CLIENT_ID` | `XXXX.apps.googleusercontent.com` | OAuth credential |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | OAuth credential |

---

## PHASE 6 — Set Up Google Pub/Sub (Real-Time Email Notifications)

This enables FintLer to know the **instant** a new bank email arrives, without polling.

### Step 13: Create a Pub/Sub Topic
1. In Google Cloud Console, go to **"Pub/Sub" → "Topics"**
2. Click **"+ Create Topic"**
3. Topic ID: `fintler-gmail-notifications`
4. Leave other settings as default
5. Click **"Create"**

### Step 14: Grant Gmail Publish Permission
Gmail needs permission to publish messages to your Pub/Sub topic.
1. Click on the topic you just created → **"Permissions"** tab
2. Click **"+ Grant Access"**
3. **New principal:** `gmail-api-push@system.gserviceaccount.com`
4. **Role:** `Pub/Sub Publisher`
5. Click **"Save"**

### Step 15: Create a Push Subscription
1. In Pub/Sub → go to **"Subscriptions"**
2. Click **"+ Create Subscription"**
3. Fill in:
   - **Subscription ID:** `fintler-gmail-push`
   - **Select a Cloud Pub/Sub topic:** `fintler-gmail-notifications`
   - **Delivery type:** `Push`
   - **Endpoint URL:** `https://lyyymymdbxpxxtrsilpa.supabase.co/functions/v1/gmail-webhook`
     *(This is the Supabase Edge Function that will receive new-email notifications)*
4. Click **"Create"**

---

## PHASE 7 — Verification Checklist Before Beta Launch

Run through this checklist before inviting your first beta user:

- [ ] Google Cloud project `FintLer MVP` created and active
- [ ] Gmail API enabled
- [ ] Cloud Pub/Sub API enabled
- [ ] OAuth consent screen configured with `gmail.readonly` scope
- [ ] At least your own Gmail added as a test user
- [ ] OAuth Client ID + Secret created and saved securely
- [ ] Supabase Auth → Google provider connected with Client ID + Secret
- [ ] Supabase Edge Function secrets set: `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] Pub/Sub topic `fintler-gmail-notifications` created
- [ ] `gmail-api-push@system.gserviceaccount.com` has Publisher role on the topic
- [ ] Push subscription pointing to your Supabase webhook function
- [ ] Test the full flow: sign in with Google → connect Gmail → see first insights

---

## PHASE 8 — Adding Beta Testers (Ongoing)

As you add more beta users (up to the 100-user limit):

1. Go to **Google Cloud → APIs & Services → OAuth consent screen**
2. Scroll to **"Test users"** section
3. Click **"+ Add Users"**
4. Enter their Gmail addresses → **"Save"**

> Users not in this list will see a **"This app is not verified"** error screen and
> cannot proceed. This is by design during beta — it's Google's security gate.

---

## PHASE 9 — Path to Public Launch (Post-Beta)

When you're ready to open FintLer to all users (not just the 100 test users):

1. Go to **OAuth consent screen → "Publish App"**
2. Google will show a warning that you need to complete **"App Verification"**
3. Submit for verification — Google will review:
   - Your privacy policy URL (must clearly state you access Gmail)
   - Your app's use of the `gmail.readonly` scope (must be justified)
   - A demo video showing the OAuth flow and what you do with the data
4. Verification typically takes **2–6 weeks**
5. Once approved, **any Google account user** can connect their Gmail to FintLer

> [!TIP]
> Start writing your Privacy Policy early. It must explicitly state:
> - What Gmail data FintLer accesses
> - What FintLer does with it (parse bank emails only)
> - What FintLer does NOT do (store raw emails, access personal emails)
> - How users can revoke access

---

## Quick Reference — Key URLs & IDs

| Resource | Value |
| :--- | :--- |
| Google Cloud Console | https://console.cloud.google.com |
| Your Project | `FintLer MVP` / `fintler-mvp` |
| Gmail API Library | https://console.cloud.google.com/apis/library/gmail.googleapis.com |
| OAuth Consent Screen | https://console.cloud.google.com/apis/credentials/consent |
| Pub/Sub Topics | https://console.cloud.google.com/cloudpubsub/topic/list |
| Supabase Auth Providers | https://supabase.com/dashboard/project/lyyymymdbxpxxtrsilpa/auth/providers |
| Supabase Edge Secrets | https://supabase.com/dashboard/project/lyyymymdbxpxxtrsilpa/settings/functions |
