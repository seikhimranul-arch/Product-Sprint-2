# FintLer - Stitch Frontend Generation Prompt (Sprint 2)

**Please use the following prompt in Stitch (or your chosen UI generation tool) to create the frontend preview for the FintLer MVP.**

---

**Role & Objective:**
Act as an expert frontend engineer and UI/UX designer. Build the frontend MVP preview for "FintLer," an AI-native Financial Clarity Engine designed to cure "Salary Day Anxiety" for Indian millennials. The app analyzes bank alert emails to deliver behavioral spending insights. 

**Design Aesthetic (Stripe x Apple Fusion):**
- **Vibe:** Premium, trustworthy, minimalist, and non-judgmental. It should feel like a native Apple application built by the Stripe design team.
- **Color Palette:** Dark Mode First. Use true black (`#000000`) or deep midnight blue for backgrounds. Highlight with vibrant, controlled neon accents (electric blue, vivid mint, soft coral) for gradients and focus states. Avoid traditional budgeting app colors (harsh reds/greens).
- **Typography:** Modern sans-serif (Inter, SF Pro, or Manrope) with strict hierarchy, crisp weights, and tight tracking.
- **Styling:** Utilize "Bento Box" grid layouts, glassmorphism (`backdrop-blur`), subtle 1px borders (`rgba(255,255,255,0.1)`), and generous whitespace.
- **Animations:** Smooth, subtle micro-interactions using framer-motion (fade-in-up on scroll, slight scale on hover).

**Core Views Required:**

**1. Landing & Auth Page (`/`)**
- **Hero:** Clean, bold heading: "Cure Salary Day Anxiety. See exactly where your money vanishes."
- **Visuals:** A stunning glassmorphic bento-box preview of the dashboard floating centrally.
- **Auth:** Prominent Apple-style "Continue with Google" button. Helper text below: *"We only read bank alert emails. Read-only access. Zero manual data entry."*
- **Features:** 3-column layout highlighting: "Real-time Sync," "Behavioral Insights," and "Zero Judgment."

**2. Syncing / Loading State (`/sync`)**
- **Visual:** A sleek, pulsating gradient ring or FaceID-style scanning animation.
- **Dynamic Text:** Cycle through: "Connecting securely to Gmail..." -> "Fetching last 90 days of bank alerts..." -> "Analyzing your spending personality without judgment..."
- **Behavior:** Auto-transition to `/dashboard` after a mock 4-second delay.

**3. Insights Dashboard (`/dashboard`) - The "Aha!" Moment**
- **Header:** "Welcome back, [Name]. Here is your financial clarity." Include a small "Connected to Gmail" status indicator (green dot).
- **Layout:** A gorgeous Bento Box grid using UI cards with `bg-black/50` and `backdrop-blur-xl`.
- **Spending Personality Badge (Top Left Bento):** A visually striking card with a fluid gradient background. Text: "Your Persona: The Weekend Warrior".
- **Insight Cards (Remaining Bento Grid):**
  1. *Summary Card:* "You spent ₹42,500 via UPI this month. 40% was on food delivery." (Include a minimal Recharts sparkline).
  2. *Category Alert Card:* Soft warning visual. "Your 'Dining Out' spend is spiking. ₹12,000 this month."
  3. *Behavioral Trigger Card:* "Moment of Impact: You make 80% of your impulse buys on Fridays after 10 PM."
  4. *Actionable Micro-Goal Card:* "Try keeping Swiggy orders under ₹500 this weekend." Add a CTA button: "Set Goal".
- **Recent Transactions List:** Minimal table at the bottom showing Date, Merchant Logo/Icon, Merchant Name (e.g., Zomato, Zepto, Uber), Category Pill, and Amount in INR (₹).

**Technical Constraints & Guidelines:**
- **Tech Stack:** React, Tailwind CSS, shadcn/ui, framer-motion, Recharts, Lucide React icons.
- **No Hallucinations:** Strictly follow the prompt. Do NOT add features like "Credit Score," "Loan Offers," or "Manual Budget Creation." FintLer is explicitly anti-lending and anti-manual budgeting.
- **Dummy Data:** Since there is no backend yet, hardcode beautiful, realistic dummy data tailored to an Indian millennial (₹ amounts, common Indian UPI merchants).
