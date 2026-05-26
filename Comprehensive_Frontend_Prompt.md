# Comprehensive Frontend Generation Prompt (Sprint 2)

**Please copy and paste the entire text below into your UI generator (Lovable, Stitch, or v0) to generate the complete FintLer MVP frontend.**

---

**Role & Objective:**
Act as an expert frontend engineer and UI/UX designer. Build the complete frontend MVP for "FintLer," an AI-native Financial Clarity Engine that cures "Salary Day Anxiety" for Indian millennials.

**Reference Design System & Aesthetic:**
Use a highly premium, dark-mode exclusive "Stripe meets Apple" design language. I have a specific design system you MUST use:
- **Background:** True black (`#000000`).
- **Typography:** `Inter` for all headlines and body text. `JetBrains Mono` for all data, amounts, and small caps labels (`text-label-caps`).
- **Icons:** Material Symbols Outlined (with `FILL 1` variations for active states).
- **Glassmorphism:** Use `backdrop-blur-xl`, `bg-surface-container/50` (or `rgba(10,10,10,0.5)`), and crisp borders like `border-white/10`.
- **Gradients & Orbs:** Use blurred background orbs (`mix-blend-screen filter blur-[100px]`) in secondary/tertiary colors behind main content to give a glow effect.
- **Tailwind Config:** Assume custom colors like `primary`, `secondary-container`, `tertiary`, `surface-container-low`, `on-surface`, and `on-surface-variant` exist based on a dark Material You palette.
- **Animations:** Implement pulse rings, rotating scan rings for loading states, and a shimmer/gradient border animation for AI elements.

**Required Screens & Features (Single Page App Layout or Routable Views):**

Please generate 3 distinct views (or a single scrolling prototype demonstrating all 3 states):

### 1. Landing & Auth View (`/`)
- **Top Nav:** Minimalist header with "FintLer" text logo and a "Log In" ghost button.
- **Hero Section:** Bold display typography: "Cure Salary Day Anxiety. See exactly where your money vanishes." (Use a gradient text clip for the second sentence).
- **CTA:** A prominent "Continue with Google" button with a Google icon.
- **Trust Label (Crucial for Backend Alignment):** Under the CTA, add a lock icon and text: "We only read bank alert emails. Read-only access."
- **Dashboard Preview:** A beautiful, slightly tilted or floating Bento Box preview of the dashboard.
- **Features Section:** 3 glassmorphic cards:
  1. *Real-time Sync:* "We securely parse your bank alert emails instantly."
  2. *Behavioral Insights:* "AI categorizes and visualizes your habits."
  3. *Zero Judgment:* "A private space. We don't sell data or judge your coffee habits."

### 2. Syncing State View (`/sync`)
- This is the transition state after clicking "Continue with Google".
- **Visual:** A centralized AI processing animation. Use concentric pulsing rings (`pulse-ring`) and a slow-rotating dashed scan ring. In the center, a glowing glassmorphic circle with an infinity/sync icon.
- **Dynamic Status Text:** Create a staggered fade-in/fade-out text area:
  1. "Connecting securely to Gmail..."
  2. "Fetching last 90 days of bank alerts..."
  3. "Analyzing your spending personality without judgment..."
- Include a sleek gradient progress bar at the bottom.

### 3. Insights Dashboard View (`/dashboard`)
- **Header:** "Welcome back, [Name]." with a subheadline "Here is your financial clarity." and a small green pulsing dot next to "Connected to Gmail".
- **Layout:** A responsive Bento Box Grid (`grid-cols-1 md:grid-cols-12` with `gap-6`).
- **The 5 Core Bento Components (Aligning with Backend PRD):**
  1. **Spending Personality (Span 8):** A large, visually striking card with a fluid gradient mesh background. Label: "Spending Personality". Title: "The Weekend Warrior". Description: "You tend to hold back during the week, but your spending peaks significantly from Friday evening to Sunday night."
  2. **Behavioral Trigger (Span 4):** Label: "Behavioral Insight". Title: "Moment of Impact". Data: "You make 80% of your impulse buys on Fridays after 10 PM." Include a lightning bolt icon. Give this card a subtle animated AI border (`ai-border-anim`).
  3. **Cash Flow Summary (Span 4):** Label: "Monthly Summary". Text: "You spent ₹42,500 via UPI this month. 40% was on food delivery." Include a minimal `Recharts` sparkline or an SVG glowing line chart at the bottom.
  4. **Category Alert (Span 4):** Warning aesthetic (soft red/error border). Label: "Spending Alert". Title: "Your 'Dining Out' spend is spiking." Large data number: "₹12,000".
  5. **Actionable Micro-Goal (Span 4):** Label: "Suggested Goal". Text: "Try keeping Swiggy orders under ₹500 this weekend." Button: "Set Goal".
- **Transactions List (Span 12):** At the bottom, a minimalist table. Headers: Date, Merchant, Category, Amount. Use dummy Indian data (e.g., Zomato, Swiggy, Uber) and format amounts in Rupees (e.g., `-₹850`). Use JetBrains Mono for dates and amounts.

**Strict Anti-Hallucination Constraints:**
- Do NOT add a sidebar with standard banking links (like Transfers, Loans, Cards).
- Do NOT add credit score widgets.
- Do NOT add manual budget creation forms. FintLer is read-only and AI-driven.

Generate the full React/Tailwind code encompassing this complete flow, ensuring the UI perfectly matches the provided dark glassmorphic design system.
