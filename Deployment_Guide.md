# FintLer MVP — Deployment Guide (Supabase + Lovable + Netlify + Gemini)

All services used below have generous **Free Tiers** perfect for launching your MVP without entering a credit card.

---

## Step 1: Set Up Supabase (Backend & Auth)

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Once the project is ready, navigate to the **SQL Editor** in the dashboard.
3. Open the `supabase/schema.sql` file from this repository.
4. Copy its contents, paste it into the SQL Editor, and click **Run**. This will create your `profiles`, `statements`, and `insights` tables, along with Auth triggers.
5. Go to **Authentication -> Providers** and make sure Email is enabled. For an easier MVP demo, you may want to turn off "Confirm email" so users don't have to verify their inbox to test the app.
6. Go to **Project Settings -> API**. Copy your **Project URL** and **anon public key**. You will need these for the frontend.

---

## Step 2: Get a Free Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in and click **"Get API Key"** -> **"Create API Key"**.
3. Copy the generated API key.

---

## Step 3: Deploy the Supabase Edge Function

The AI parsing happens securely on the backend using Edge Functions.

### Option A: Via the Supabase Dashboard (Easiest)
1. In your Supabase dashboard, go to **Edge Functions**.
2. Click **"Create a new function"**.
3. Name it exactly: `parse-statement`.
4. Copy the entire contents of `supabase/functions/parse-statement/index.ts` from this repo and paste it into the code editor.
5. Click **Deploy**.
6. After it deploys, go to **Edge Functions -> Secrets** (or Project Settings -> Edge Functions).
7. Add a new secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** (paste your Gemini API key here)

### Option B: Via Supabase CLI
```bash
# Install CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref <your-project-id>

# Set the secret
supabase secrets set GEMINI_API_KEY=your-gemini-key

# Deploy the function
supabase functions deploy parse-statement
```

---

## Step 4: Generate the Frontend with Lovable

1. Go to [Lovable.dev](https://lovable.dev/) and click **"New Project"**.
2. Open the `Lovable_Frontend_Prompt.md` file located in this repository.
3. Copy the **entire contents** of that file and paste it into Lovable's chat as your initial prompt.
4. Lovable will scaffold the React + Tailwind application.
5. When prompted or via Lovable's Integrations settings, provide your Supabase details:
   - **URL:** Your Supabase Project URL
   - **Anon Key:** Your Supabase anon public key

---

## Step 5: Deploy the Frontend to Netlify

Once the frontend looks good in Lovable's preview:

1. Inside Lovable, go to **Settings -> Deploy**.
2. Select **Netlify**.
3. Connect your Netlify account (it will auto-deploy the build).
4. **Important:** In your Netlify Site Settings, go to **Environment Variables** and ensure these are set:
   - `VITE_SUPABASE_URL` = Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon public key
5. Trigger a new deploy in Netlify if you added the variables manually.

---

## Final Verification
1. Visit your live Netlify URL.
2. Sign up for a test account.
3. Upload a mock bank statement text file or CSV.
4. Verify that the loading state appears, and the AI correctly generates the 4 Insights and your "Spending Personality".
