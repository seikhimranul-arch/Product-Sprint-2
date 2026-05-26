# FintLer - Lovable Frontend Generation Prompt (Sprint 2)

**Please copy and paste the entire text below into Lovable as your initial prompt to generate the FintLer MVP frontend.**

---

I want to build the frontend MVP for "FintLer", an AI-native Financial Clarity Engine that cures "Salary Day Anxiety" for millennials. The backend (Supabase with Edge Functions for Gmail transaction parsing) will be connected later. 

### Design Aesthetic (Stripe & Apple Fusion)
The UI MUST feel extremely premium, taking the best of Apple and Stripe.
- **Vibe:** Minimalist, trustworthy, high-end, non-judgmental. Do not build a generic template. It must feel like a native Apple product built by Stripe.
- **Color Palette (Dark Mode First):** True black (`#000000`) or deep midnight blue background. Use Stripe-style vibrant but controlled neon accents (e.g., electric blue, soft coral, vivid mint) for gradients and highlights. Avoid aggressive solid red/green typical of traditional budgeting apps.
- **Typography:** Modern sans-serif (Inter, SF Pro, or Manrope) with strict hierarchy, varying weights, and tight tracking.
- **Styling:** Heavy use of Apple-like "Bento Box" layouts, glassmorphism (backdrop-blur), crisp subtle borders (1px solid rgba(255,255,255,0.1)), and generous whitespace. 
- **Animations:** Use `framer-motion` for smooth, subtle micro-interactions (hover scales, fade-in-up on scroll, spring animations).

### Core Flows & Pages

**1. Landing & Auth Page (`/`)**
- **Hero Section:** Clean, bold typography: "Cure Salary Day Anxiety. See exactly where your money vanishes."
- **Visuals:** A stunning glassmorphic bento-box preview of the dashboard floating in the center.
- **Auth:** A prominent, Apple-style "Continue with Google" button. The text below it should say: *"We only read bank alert emails. Read-only access. Zero manual data entry."*
- **Features Section:** 3-column layout highlighting: "Real-time Sync", "Behavioral Insights", "Zero Judgment".

**2. Syncing / Loading State (`/sync`)**
- After clicking "Continue with Google", route to a loading screen.
- **Visual:** A sleek, pulsating gradient ring or Apple-like FaceID style scan animation.
- **Text:** "Connecting securely to Gmail..." changing to "Fetching last 90 days of bank alerts..." changing to "Analyzing your spending personality without judgment..."
- Use a mock `setTimeout` to automatically route to `/dashboard` after 4 seconds.

**3. The Insights Dashboard (`/dashboard`) - (The "Aha!" Moment)**
- **Layout:** A gorgeous, dashboard in a Bento Box grid structure using `shadcn/ui` cards.
- **Header:** "Welcome back, [Name]. Here is your financial clarity." Include a minimal "Connected to Gmail" status pill with a green dot.
- **Spending Personality Badge (Top Left Bento):** A visually striking card with a fluid, animated gradient background. Example Text: "Your Persona: The Weekend Warrior".
- **Insight Cards (Remaining Bento Grid):**
  1. **Summary Card:** "You spent ₹42,500 via UPI this month. 40% was on food delivery." (Use a small Recharts sparkline to make it look premium).
  2. **Category Alert Card:** Soft warning color. "Your 'Dining Out' spend is spiking. ₹12,000 this month."
  3. **Behavioral Trigger Card:** "Moment of Impact: You make 80% of your impulse buys on Fridays after 10 PM."
  4. **Actionable Micro-Goal Card:** "Try keeping Swiggy orders under ₹500 this weekend." Highlighted with a positive, actionable CTA button like "Set Goal".
- **Recent Transactions List:** A sleek, minimal list at the bottom showing: Date, Merchant Logo (or generic icon), Merchant Name, Category Pill, and Amount.

### Technical Requirements & Anti-Hallucination Guidelines
- **Tech Stack:** React, Tailwind CSS, shadcn/ui, framer-motion, Recharts, Lucide React icons.
- **Strictly adhere to the prompt:** Do not invent features like "Loan Offers", "Credit Score", or "Budget Creation". FintLer is explicitly anti-lending and anti-manual budgeting.
- **Dummy Data:** Since the backend is not connected yet, hardcode beautiful dummy data that fits an Indian millennial (e.g., amounts in ₹, merchants like Zomato, Swiggy, Uber, Zepto).
- **Component Quality:** Ensure all shadcn cards have `backdrop-blur-xl`, `bg-black/50`, and subtle borders to achieve the Stripe/Apple glassmorphic fusion. 

Please scaffold the entire application based on these exact specifications.
