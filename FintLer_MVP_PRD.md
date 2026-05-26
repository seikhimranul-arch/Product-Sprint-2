# Product Requirements Document (PRD)
## FintLer: AI Financial Clarity Engine (MVP)

**Document Version:** 1.3 — Email Transaction Capture Added
**Target Market:** India (Urban Salaried Millennials)
**Date:** May 2026
**Author:** AI Product Manager
**Reference:** See `FintLer_Competitive_Analysis.md` for full competitive intelligence.

---

### 1. Executive Summary & Vision
**Vision:** To transform "invisible" UPI micro-transactions into conscious financial decisions, helping Indian millennials overcome "Salary Day Spending Anxiety" without the friction of manual data entry or the shame of traditional budgeting.

**Core Value Proposition:** A unified, secure, AI-assisted financial dashboard that analyzes raw banking data to provide instant, behavioral insights into spending habits, reducing financial stress and increasing cash visibility.

### 2. Market Context & Problem Space
**The Problem:** The rapid adoption of UPI has removed the "pain of paying." For salaried millennials, this results in the "Rs 200 economy" — unconscious, high-frequency, low-value spending. By the 20th of the month, they feel financially squeezed despite earning well.
*   **The Psychological Need:** Reintroducing friction and consciousness into spending, but without the manual labor of legacy apps. They need to know *why* they spend, not just *what* they spend on.
*   **The Reality:** 55% of young professionals live paycheck to paycheck, facing a gap between salary growth, inflation, and lifestyle inflation (unsecured debt/BNPL).

### 3. Target Audience & Personas
**Primary Persona: The "UPI Salary Day" Millennial**
*   **Demographics:** 22–35 years old, earning ₹50k-150k/month, living in Tier-1/Tier-2 Indian cities.
*   **Behaviors:** Uses UPI for 90%+ of transactions. Often splits bills. Active but sporadic investor (SIPs, Stocks).
*   **Pain Points:** "Death by a thousand cuts" via UPI. High financial anxiety. Feels judged by traditional budgeting apps that just say "spend less."
*   **JTBD (Jobs-to-be-Done):** "Show me exactly where my money vanished to this month without making me do data entry, and give me ONE actionable thing to fix without shaming me."

### 4. Competitive Landscape (India 2025/2026)

| Competitor | Users | D30 Retention | Their Moat | Their Blind Spot |
| :--- | :--- | :--- | :--- | :--- |
| **Jupiter Money** | 3M+ | ~18–20% | Design + Rewards + Multi-product | No behavioral psychology; requires new bank account |
| **Axio (Walnut)** | 15M+ | ~12–15% | SMS auto-tracking + BNPL credit | Pivoting to lending = loss of trust; SMS tracking declining |
| **MoneyView** | 30M+ downloads | ~15–18% | Loan marketplace + credit score | Conflict of interest: sells loans using your spend data |

**Our Differentiator (Blue Ocean):**
- **None of the top 3 answer "WHY you spend"** — they only tell you *what* you spent.
- **None have Spending Personalities** — users have no emotional identity with their finances.
- **All are pivoting to credit/lending** — FintLer is the only pure, objective, non-judgmental advisor.
- **No competitor uses behavioral trigger mapping** (payday Fridays, post-10PM impulse purchases).

> FintLer's moat is **trust + behavioral data depth + emotional identity** — compounding over time.

### 5. MVP Scope & Core Features
The MVP focuses purely on the "Aha!" moment of delivering a mind-blowing financial insight with minimal friction. Features are now aligned against the top competitor gaps identified in the competitive analysis.

**MVP (V1) — Shipped Now:**
| Feature | Description | Competitor Gap Filled | Priority |
| :--- | :--- | :--- | :--- |
| **Onboarding & Auth** | Email login (Google OAuth preferred). Minimal steps to first insight. | All competitors have long onboarding | P0 |
| **📧 Bank Email Transaction Capture** | Connect Gmail via OAuth → FintLer reads only bank alert emails → Extracts transaction data automatically, in real time. No PDF uploads, no SMS access required. | SMS dying on iOS; PDF upload is high friction | **P0 — Primary** |
| **Bank Statement Upload (PDF/CSV)** | Fallback option for users who prefer manual upload or use non-Gmail email. | Backup for non-Gmail users | P1 |
| **Behavioral Insight Engine** | Gemini-powered analysis via Supabase Edge Function. Synthesizes parsed email transactions into 4 insights + personality. | No competitor answers "why you spend" | P0 |
| **4 AI Insight Cards** | Summary · Category Alert · Behavioral Trigger · Actionable Recommendation | Competitors only show "what" not "why" | P0 |
| **Spending Personality Badge** | AI-assigned persona ("Weekend Warrior", "Midnight Snacker") — shareable, identity-driven | Zero competition in this space | P0 |

---

### 5a. Feature Deep-Dive: Bank Email Transaction Capture

**Why Email > SMS > PDF:**

| Method | iOS Support | Android Support | Reliability | Friction | Real-time? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| SMS Parsing (Axio approach) | ❌ Blocked | ⚠️ Declining | Low (OS restrictions) | Low | Yes |
| PDF/CSV Upload (current) | ✅ | ✅ | High | **High (manual)** | No (monthly) |
| **Gmail Email Capture (FintLer)** | ✅ | ✅ | **High** | **Low (one-time OAuth)** | **Yes (per transaction)** |

> **Key Insight:** Every major Indian bank (HDFC, ICICI, SBI, Axis, Kotak, YES Bank) automatically sends an email alert for every debit, credit, UPI transaction, and card swipe. These emails are highly consistent in format, arrive instantly, and sit untouched in the user's inbox. FintLer turns this dormant data into real-time intelligence.

#### 5a.1 — User Flow (Email Connect)
```
1. SIGN UP → User logs in via Google (Gmail OAuth)
   └── FintLer requests: gmail.readonly scope ONLY
   └── Consent screen clearly states: "We read ONLY emails from your bank. Nothing else."

2. INITIAL SYNC (one-time, on first connect)
   └── FintLer fetches last 90 days of bank alert emails
   └── Filtered by: known sender domains (alerts@hdfcbank.net, notify@icicibank.com, etc.)
   └── Extracts: Amount · Merchant · Date/Time · Debit/Credit · Account last 4 digits
   └── Stores structured transactions in `transactions` table (NOT the raw email body)
   └── Deletes raw email body from memory immediately after parsing

3. FIRST INSIGHT (within 60 seconds of connecting)
   └── "We found 147 transactions in the last 90 days. Analyzing..."
   └── Gemini Edge Function synthesizes behavioral insights from structured transaction data
   └── Dashboard renders: Spending Personality + 4 Insight Cards

4. ONGOING SYNC (real-time, via Gmail Push Notifications)
   └── Google Pub/Sub notifies FintLer when a new bank alert email arrives
   └── FintLer parses and logs the new transaction within seconds
   └── User's dashboard updates automatically — no app open required
   └── WhatsApp nudge triggered if anomaly detected (V2)
```

#### 5a.2 — Email Parsing Logic

**Supported Banks & Sender Domains (MVP — expandable):**
| Bank | Sender Domain | Transaction Types Captured |
| :--- | :--- | :--- |
| HDFC Bank | `alerts@hdfcbank.net` | Debit/Credit · UPI · Card · NEFT/IMPS |
| ICICI Bank | `notify@icicibank.com` | Debit/Credit · UPI · Card · NEFT |
| SBI | `sbmops@sbi.co.in` | Debit/Credit · NEFT/RTGS/IMPS |
| Axis Bank | `alerts@axisbank.com` | Debit/Credit · UPI · Card |
| Kotak Mahindra | `noreply@kotak.com` | Debit/Credit · UPI · Card |
| YES Bank | `donotreply@yesbank.in` | Debit/Credit · UPI · Card |

**Two-Layer Parsing Pipeline (inside Supabase Edge Function):**
```
Layer 1 — Regex Fast-Path (handles ~85% of volume)
  ├── Match known bank email patterns
  ├── Extract: amount (₹X,XXX), merchant string, date, debit/credit flag
  └── Output: structured JSON

Layer 2 — Gemini AI Fallback (handles ~15% edge cases)
  ├── Called ONLY when regex fails (template changed, new bank, unusual format)
  ├── Prompt: "Extract transaction details from this bank alert email as JSON:
  │           {amount, merchant, date_time, type: debit|credit, account_last4}"
  └── Output: same structured JSON schema
```

**Normalized `transactions` Schema (Supabase):**
```sql
CREATE TABLE public.transactions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  email_message_id text,              -- Gmail message ID (for dedup; not stored after parse)
  bank_name       text NOT NULL,      -- 'hdfc' | 'icici' | 'sbi' | 'axis' | 'kotak' | 'yes'
  account_last4   text,               -- last 4 digits of account/card
  amount_inr      integer NOT NULL,   -- in paise-free INR
  type            text NOT NULL,      -- 'debit' | 'credit'
  merchant        text,               -- normalized merchant name
  raw_merchant    text,               -- original string from email (e.g. "PAYTMTATASKYBROADBAN")
  category        text,               -- AI-categorized: 'food' | 'travel' | 'shopping' | 'utilities' | 'transfer' etc.
  transacted_at   timestamptz NOT NULL,
  day_of_week     text,               -- 'monday' .. 'sunday' (pre-computed for Moment-of-Impact)
  hour_of_day     integer,            -- 0..23 (pre-computed for Moment-of-Impact)
  created_at      timestamptz DEFAULT now()
);
-- RLS: user sees only their own transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
```

**Stored OAuth Tokens (secure):**
```sql
CREATE TABLE public.email_connections (
  user_id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  provider        text DEFAULT 'gmail',
  access_token    text NOT NULL,       -- encrypted at rest (Supabase Vault)
  refresh_token   text NOT NULL,       -- encrypted at rest
  token_expiry    timestamptz,
  gmail_history_id text,              -- for Gmail push notification sync point
  connected_at    timestamptz DEFAULT now(),
  revoked_at      timestamptz          -- set when user disconnects
);
```

#### 5a.3 — Privacy & Consent Rules (Non-Negotiable)
| Rule | Implementation |
| :--- | :--- |
| **Read-only, bank-only** | Gmail scope: `gmail.readonly`. Filter applied server-side: ONLY emails from known bank domains |
| **No email body stored** | Raw email text is parsed in-memory inside Edge Function and immediately discarded. Only structured JSON is persisted. |
| **User can disconnect anytime** | Dashboard "Connected Accounts" panel with one-tap "Disconnect Gmail" — revokes OAuth token and deletes `email_connections` row |
| **No cross-user email access** | Each Edge Function call is scoped to the authenticated user's own OAuth token |
| **DPDP Act (2023) compliant** | Granular consent given at OAuth screen; data deletion available on request |

---

**V2 — Next Sprint:**
| Feature | Description | Strategic Rationale | Priority |
| :--- | :--- | :--- | :--- |
| **WhatsApp Weekly Nudge** | Friday 5PM: "Your Friday Spike is back. Tap to see." | Beats D30 benchmark; Axio/Jupiter don't do this | P1 |
| **Micro-Goal Engine** | "Spend ₹500 less on Swiggy this week" — set in-app | Drives return visits; actionable vs passive | P1 |
| **Account Aggregator (Setu AA)** | Frictionless auto-sync — additional data source | Adds bank data AA doesn't reach | P1 |
| **Moment-of-Impact Timeline** | "You spend 40% more on Fridays after 9PM" — visual heatmap | Enabled by `day_of_week` + `hour_of_day` pre-computation | P2 |

**V3 — Growth Phase:**
| Feature | Description | Strategic Rationale | Priority |
| :--- | :--- | :--- | :--- |
| **Peer Cohort Benchmarking** | "You spend 18% less than 28yo in Bengaluru earning ₹80k" | Social proof as motivation; zero competition | P2 |
| **Personality Evolution Tracker** | Monthly personality shift — "You moved from Stress Spender → Mindful Spender" | Gamified progress; compounding retention | P3 |

### 6. User Journeys
1.  **The Hook (Acquisition):** User sees an ad about "Salary Day Anxiety."
2.  **Activation:** User signs up with Google (Gmail OAuth). FintLer requests `gmail.readonly` access. Consent screen: *"We only read emails from your bank — nothing personal."*
3.  **Instant Sync:** FintLer fetches the last 90 days of bank alert emails in the background. Extracts and categorizes every transaction. Raw emails are NOT stored.
4.  **The "Aha!" Moment:** Within 60 seconds, the AI presents their *"Spending Personality"* and a mind-blowing insight (e.g., *"You made 23 food delivery orders after 10PM last month — totalling ₹6,800."*)
5.  **Retention:** User opts in to real-time WhatsApp nudges triggered by new bank email alerts.

### 7. Technical Architecture & Data Strategy
*   **Frontend:** Lovable (React / Tailwind) for rapid deployment to Netlify. Google OAuth sign-in button (replaces email/password as primary auth).
*   **Backend & Auth:** Supabase (PostgreSQL, Edge Functions, Auth + Vault for encrypted token storage).
*   **Email Ingestion:** Gmail API (OAuth 2.0, `gmail.readonly` scope) + Google Pub/Sub for real-time push notifications on new emails.
*   **Parsing Pipeline:** Supabase Edge Function (`parse-email-transactions`) — Layer 1 Regex → Layer 2 Gemini AI fallback.
*   **AI Layer:** Google Gemini API (Free Tier) — used for both email parsing fallback AND behavioral insight generation. Keys stored in Supabase Vault secrets.
*   **Data Evolution (Post-MVP):** Add Setu Account Aggregator as a complementary data source for users whose banks don't send email alerts consistently.

**Key Supabase Tables:**
| Table | Purpose |
| :--- | :--- |
| `profiles` | User profile + spending personality |
| `email_connections` | Encrypted Gmail OAuth tokens + sync state |
| `transactions` | Parsed transaction records (amount, merchant, category, timestamp, day/hour pre-computed) |
| `insights` | AI-generated insight snapshots (refreshed weekly or on-demand) |
| `statements` | Fallback: manual PDF/CSV uploads (for non-Gmail users) |

### 8. Security, Compliance & Regulatory Requirements
*   **Data Residency:** All personal and financial data must be stored and encrypted in India (Supabase India region).
*   **Regulatory Compliance:** Adhere to the DPDP Act (2023). OAuth consent screen explicitly discloses what data is accessed and why.
*   **Gmail OAuth:** Scope strictly limited to `gmail.readonly`. Token stored encrypted in Supabase Vault. Users can revoke at any time from their Google Account settings OR from within the FintLer dashboard.
*   **Email Raw Data:** Raw email bodies are processed in-memory inside the Edge Function and NEVER persisted to the database. Only the structured extracted fields are stored.
*   **Google Verification:** FintLer will need to complete Google's OAuth App Verification process (sensitive scope review) before public launch. During beta/MVP, limited to verified test accounts.
*   **Encryption:** All OAuth tokens encrypted at rest (Supabase Vault). Transaction data encrypted in Postgres with AES-256.

### 9. Engagement & Retention Strategy
Indian fintech apps average 10-15% D30 retention. We will beat this using the Hook Model:
*   **External Trigger:** WhatsApp Business API integration. Friday 5:00 PM nudge: "Your weekend budget is looking tight. See your Friday Spike insight."
*   **Internal Trigger:** Post-UPI purchase guilt.
*   **Variable Reward:** AI identifies new behavioral patterns or updates Peer Benchmarking percentiles.
*   **Investment:** User corrects an AI category or sets a micro-goal.

### 10. Success Metrics (KPIs & KRAs)

**KPIs — Measured Weekly:**
| KPI | Definition | MVP Target | Industry Benchmark |
| :--- | :--- | :--- | :--- |
| **Activation Rate** | % of signups who upload statement + view dashboard | >60% | ~50% typical |
| **Time-to-Value** | Signup → First AI Insight | <2 minutes | <5 min typical |
| **D7 Retention** | Return within 7 days | >35% | 20–25% typical |
| **D30 Retention** | Return within 30 days | >22% | 10–15% typical |
| **Personality Share Rate** | % who share Spending Personality card | >15% | N/A (new metric) |
| **Insight Engagement Rate** | % who read all 4 insight cards | >70% | N/A |
| **WhatsApp Opt-in Rate** | % who opt into weekly nudges (V2) | >40% | N/A |

**KRAs — Measured Monthly:**
- Drive activation through "zero-friction, instant-insight" onboarding
- Build behavioral data depth per user (track statements uploaded over time)
- Grow organic/viral user acquisition via Personality Badge sharing
- Maintain brand positioning as the only non-lending, non-judgmental financial advisor
- Achieve 3:1 LTV:CAC ratio within 6 months of monetization

**OKRs — Q1 (MVP Launch):**
| Objective | Key Results |
| :--- | :--- |
| O1: Prove Core Insight Value | KR1: 500 users upload statement; KR2: 70%+ read all 4 insight cards |
| O2: Build Viral Loop | KR1: 15% Personality Badge share rate; KR2: 20% of new signups from shares |
| O3: Beat Retention Benchmark | KR1: D30 >20%; KR2: D7 >35% |

### 11. Future Roadmap (Post-MVP)
*   **Phase 2 — Frictionless Activation (Week 3–4):** Account Aggregator (Setu AA) integration for auto-sync. Remove the PDF upload entirely. WhatsApp nudge system. Micro-Goal Engine.
*   **Phase 3 — Behavioral Moat (Month 2–3):** Peer cohort benchmarking (anonymous). Moment-of-Impact Timeline (spending heatmap by hour/day). Personality Evolution Tracker.
*   **Phase 4 — Monetization (Month 4–6):** Freemium model — 1 free statement analysis/month; ₹99/month for unlimited + peer benchmarking. NO lending products. Revenue from product subscriptions only.
*   **Phase 5 — B2B (Month 6+):** White-label the AI Behavioral Insight Engine to HR platforms (employee financial wellness) and small NBFCs who lack AI insight capabilities.

### 12. What FintLer Will NEVER Do (Strategic Constraints)
These constraints ARE the moat. Do not compromise them:
- ❌ Never sell or recommend loans/credit products to users
- ❌ Never use user data to serve financial product ads
- ❌ Never use a judgmental or shame-based tone in AI insights
- ❌ Never require users to switch their primary bank account
