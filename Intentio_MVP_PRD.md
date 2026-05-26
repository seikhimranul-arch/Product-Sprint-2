# Product Requirements Document (PRD)
## Intentio: AI Financial Clarity Engine (MVP)

**Document Version:** 1.0
**Target Market:** India (Urban)
**Date:** May 2026
**Author:** AI Product Manager

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
*   **Fi Money / Jupiter:** Neobanks offering clean UPI interfaces and basic auto-categorization. *Gap: They are full banking solutions; users may hesitate to switch primary accounts just for insights.*
*   **Axio:** Strong in SMS-based expense tracking and BNPL. *Gap: SMS tracking is becoming unreliable due to OS restrictions and doesn't capture the full picture like Account Aggregators do. Heavy focus on credit.*
*   **Our Differentiator (Blue Ocean):** Instead of generic tracking, we provide deep, AI-driven behavioral analysis ("Spending Personalities") and emotional reassurance via Peer Benchmarking.

### 5. MVP Scope & Core Features
The MVP focuses purely on the "Aha!" moment of delivering a mind-blowing financial insight with minimal friction.

| Feature | Description | Priority |
| :--- | :--- | :--- |
| **Onboarding & Auth** | Mobile OTP / Email login. Low friction. | P0 |
| **Data Acquisition (V1)** | Secure Bank Statement Upload (PDF/CSV) for instant parsing. | P0 |
| **AI Parsing Engine** | Backend proxy (Supabase Edge Function) securely calling Claude API to categorize messy NEFT/UPI strings. | P0 |
| **Insight Dashboard** | 4 core AI Insights: Summary, Category Alert, Behavioral Trigger, Recommendation. | P0 |
| **Spending Personality** | AI assigns a persona (e.g., "Weekend Warrior") to drive sharing and gamification. | P1 |

### 6. User Journeys
1.  **The Hook (Acquisition):** User sees an ad about "Salary Day Anxiety."
2.  **Activation:** User signs up and uploads their last month's PDF bank statement.
3.  **The "Aha!" Moment:** Within 60 seconds, the AI parses the data and presents their "Spending Personality" and one shocking insight (e.g., "You spent ₹4,000 on Swiggy after 10 PM last month").
4.  **Retention:** User opts in to weekly WhatsApp nudges for ongoing monitoring.

### 7. Technical Architecture & Data Strategy
*   **Frontend:** React / Next.js (Optimized for Mobile Web).
*   **Backend & Auth:** Supabase (PostgreSQL, Edge Functions, Auth).
*   **AI Layer:** Anthropic Claude API. **CRITICAL:** Keys must be stored securely in the backend, never exposed to the frontend.
*   **Data Evolution (Post-MVP):** Transition from PDF uploads to **Account Aggregator (AA) Integration (via Setu)** for continuous, automated, consent-based data syncing.

### 8. Security, Compliance & Regulatory Requirements
*   **Data Residency:** All personal and financial data must be stored and encrypted in India.
*   **Regulatory Compliance:** Adhere to the DPDP Act (2023). Ensure granular consent for data processing.
*   **Security:** AES-256 encryption at rest. No storage of raw bank statements post-parsing in the MVP phase (delete after AI extraction).

### 9. Engagement & Retention Strategy
Indian fintech apps average 10-15% D30 retention. We will beat this using the Hook Model:
*   **External Trigger:** WhatsApp Business API integration. Friday 5:00 PM nudge: "Your weekend budget is looking tight. See your Friday Spike insight."
*   **Internal Trigger:** Post-UPI purchase guilt.
*   **Variable Reward:** AI identifies new behavioral patterns or updates Peer Benchmarking percentiles.
*   **Investment:** User corrects an AI category or sets a micro-goal.

### 10. Success Metrics (KPIs)
*   **Activation Rate:** % of signups who successfully upload a statement and view their dashboard (> 60%).
*   **Time-to-Value:** Average time from signup to first AI insight (< 2 minutes).
*   **Retention:** D7 and D30 retention rates (Target > 20% for D30).
*   **Engagement:** WhatsApp nudge open rate and Click-Through Rate (CTR).

### 11. Future Roadmap (Post-MVP)
*   **Phase 2 (Frictionless):** Account Aggregator (Setu AA) integration for auto-sync.
*   **Phase 3 (Community):** Real peer benchmarking using anonymized, aggregated cohort data.
*   **Phase 4 (Monetization/B2B):** White-label the AI insight engine API for smaller NBFCs or cooperative banks.
