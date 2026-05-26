# FintLer Frontend MVP - Complete Generation Prompt (v2)

**Copy and paste the entire prompt below into your UI generator (Lovable, Stitch, v0, or Claude/ChatGPT) to generate the complete React application based on your exact HTML reference.**

---

**Role & Objective:**
Act as an expert React frontend engineer and UI/UX designer. I am providing you with the exact HTML, custom CSS, and Tailwind configuration for my design system. Your task is to convert this reference code into a fully functional, multi-screen React application (using React Router or state-based view switching) that includes all the features required for the FintLer MVP.

### 1. The Design System & Constraints
- **Tech Stack:** React, Tailwind CSS, `framer-motion` (for animations), `lucide-react` (or keep the existing Material Symbols Outlined).
- **Aesthetic:** Strictly maintain the premium, dark-mode look provided in the reference code. You MUST use the exact custom colors (`secondary-container`, `tertiary`, `surface-container/30`, etc.), glassmorphism (`backdrop-blur-xl`), and animations (`pulse-ring`, `scan-ring`, `ai-border-anim`) defined in my `<style>` tags and Tailwind config.
- **Typography:** `Inter` for all headlines/body text. `JetBrains Mono` for all data, amounts, and `text-label-caps`.
- **Anti-Hallucination Constraints:** Do NOT invent features like credit score widgets, loan offers, standard banking sidebars, or manual budget creation forms. FintLer is strictly a read-only, AI-driven behavioral insight tool.

### 2. Required Screens & Features (Aligned with Backend PRD)
You must build 3 main views. Please ensure the app can seamlessly transition between them (e.g., clicking "Continue with Google" goes to Syncing, which auto-transitions to Dashboard after a few seconds).

#### View 1: Landing & Auth (`/`)
- **Base:** Use the provided Landing HTML as your foundation.
- **Key Elements:** 
  - Hero section ("Cure Salary Day Anxiety").
  - A prominent "Continue with Google" button.
  - Crucial Trust Label below the button: Lock icon with "We only read bank alert emails. Read-only access."
  - 3 Feature Cards: Real-time Sync, Behavioral Insights, Zero Judgment.

#### View 2: Syncing State (`/sync`)
- **Base:** Use the provided Syncing State HTML.
- **Key Elements:** 
  - The centralized processing animation with concentric `pulse-ring` elements and the rotating `scan-ring`.
  - Staggered dynamic text animation cycling through: "Connecting securely to Gmail..." -> "Fetching last 90 days of bank alerts..." -> "Analyzing your spending personality without judgment..."
  - A bottom progress bar.

#### View 3: Insights Dashboard (`/dashboard`) - The "Aha!" Moment
- **Base:** Use the provided Dashboard HTML.
- **Key Elements:** A responsive Bento Box Grid (`grid-cols-1 md:grid-cols-12`). It MUST contain these exactly 5 components:
  1. **Spending Personality (Span 8):** Fluid gradient background. Title: "The Weekend Warrior".
  2. **Behavioral Insight (Span 4):** Title: "Moment of Impact". Data: "You make 80% of your impulse buys on Fridays after 10 PM." Must have the animated AI border (`ai-border-anim`).
  3. **Monthly Summary (Span 4):** "You spent ₹42,500 via UPI this month. 40% was on food delivery." Incorporate a sleek sparkline chart.
  4. **Spending Alert (Span 4):** Warning aesthetic (red/error border). Title: "Your 'Dining Out' spend is spiking." Data: "₹12,000".
  5. **Actionable Micro-Goal (Span 4):** "Try keeping Swiggy orders under ₹500 this weekend." Button: "Set Goal".
- **Transactions Table (Span 12):** A minimalist table at the bottom showing Date, Merchant (Zomato, Swiggy, Uber), Category, and Amount formatted in Rupees (e.g., `-₹850`).

### 3. Reference Code Structure
Please extract the exact Tailwind `theme.extend.colors`, custom CSS `@keyframes`, and HTML structures from the code blocks below to build the React components.

**[PLEASE APPEND YOUR 4 HTML BLOCKS HERE BEFORE SUBMITTING TO THE AI]**
