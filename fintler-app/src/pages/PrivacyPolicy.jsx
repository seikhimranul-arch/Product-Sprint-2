import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <main className="flex-grow pt-24 pb-20 px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto w-full">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-tertiary transition-colors mb-8"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Home
          </Link>

          <div className="glass-card rounded-2xl p-8 md:p-12 legal-content">
            <div className="mb-8">
              <h1 className="text-headline-lg text-on-surface mb-2">Privacy Policy</h1>
              <p className="text-label-caps text-on-surface-variant/60">
                Last updated: May 26, 2026 &middot; Version 1.0
              </p>
            </div>

            <nav className="mb-10 p-4 rounded-lg bg-surface-container-low/50 border border-white/5">
              <div className="text-label-caps text-on-surface-variant/60 mb-3">Contents</div>
              <ol className="list-decimal list-inside space-y-1 text-body-sm text-tertiary">
                <li><a href="#info-collect">Information We Collect</a></li>
                <li><a href="#how-use">How We Use Your Information</a></li>
                <li><a href="#gmail-api">Gmail API &amp; Google Limited Use Disclosure</a></li>
                <li><a href="#data-storage">Data Storage &amp; Security</a></li>
                <li><a href="#your-rights">Your Rights</a></li>
                <li><a href="#regulatory">Indian Regulatory Compliance</a></li>
                <li><a href="#contact">Contact &amp; Grievance Officer</a></li>
              </ol>
            </nav>

            <section id="info-collect">
              <h2>1. Information We Collect</h2>
              <p>When you sign in with Google, we receive:</p>
              <ul className="list-disc">
                <li><strong>Account Information:</strong> Your name, email address, and profile picture from your Google account.</li>
                <li><strong>Gmail Messages (Read-Only):</strong> We access only emails matching bank transaction alert patterns (e.g., from your bank's sender address containing keywords like "debited", "credited", "transaction"). We do not read personal, social, or other emails.</li>
              </ul>
              <p>We do <strong>not</strong> collect passwords, bank account numbers, credit card numbers, or any financial credentials.</p>
            </section>

            <section id="how-use">
              <h2>2. How We Use Your Information</h2>
              <ul className="list-disc">
                <li><strong>Transaction Parsing:</strong> Extract amounts, merchant names, dates, and categories from bank alert emails.</li>
                <li><strong>Spend Categorization:</strong> Automatically classify transactions into categories (food, transport, subscriptions, etc.).</li>
                <li><strong>AI-Generated Insights:</strong> Generate personalized financial summaries, spending patterns, and actionable insights.</li>
                <li><strong>Dashboard Display:</strong> Present your financial data in a clear, visual dashboard.</li>
              </ul>
              <p>We will <strong>never</strong> sell, rent, or share your personal data with advertisers or third-party data brokers.</p>
            </section>

            <section id="gmail-api">
              <h2>3. Gmail API &amp; Google Limited Use Disclosure</h2>
              <p>
                FintLer's use of information received from Google APIs adheres to the{" "}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements:
              </p>
              <ul className="list-disc">
                <li>We request <strong>read-only access</strong> to Gmail (<code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">gmail.readonly</code>). We cannot send, delete, or modify your emails.</li>
                <li>Data extracted from Gmail is used <strong>solely</strong> to provide you with the FintLer service as described above.</li>
                <li>We do <strong>not</strong> use Gmail data for advertising, market research, or any purpose unrelated to the core product.</li>
                <li>We do <strong>not</strong> allow humans to read your email content unless required for security purposes, to comply with applicable law, or with your explicit consent.</li>
                <li>We do <strong>not</strong> transfer Gmail data to third parties, except as necessary to provide the service (e.g., encrypted storage on cloud infrastructure).</li>
              </ul>
            </section>

            <section id="data-storage">
              <h2>4. Data Storage &amp; Security</h2>
              <ul className="list-disc">
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256) on our cloud infrastructure.</li>
                <li><strong>No Raw Emails:</strong> We do not store raw email content. Only structured transaction data (amount, merchant, date, category) is retained.</li>
                <li><strong>Data Retention:</strong> Your parsed transaction data is retained as long as your account is active. You may request deletion at any time.</li>
                <li><strong>Infrastructure:</strong> Data is hosted on Supabase (PostgreSQL) with enterprise-grade security.</li>
              </ul>
            </section>

            <section id="your-rights">
              <h2>5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc">
                <li><strong>Access:</strong> Request a copy of all personal data we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of any inaccurate data.</li>
                <li><strong>Deletion:</strong> Request complete deletion of your account and all associated data. We will process this within 30 days.</li>
                <li><strong>Revoke Access:</strong> Disconnect Gmail access at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Permissions</a> page.</li>
                <li><strong>Data Portability:</strong> Export your transaction data in a machine-readable format.</li>
              </ul>
            </section>

            <section id="regulatory">
              <h2>6. Indian Regulatory Compliance</h2>
              <p>FintLer is designed in compliance with:</p>
              <ul className="list-disc">
                <li><strong>Information Technology Act, 2000</strong> and its amendments.</li>
                <li><strong>IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> — We implement reasonable security practices for handling sensitive personal data.</li>
                <li><strong>RBI Data Localization Guidelines</strong> — Financial transaction data of Indian users is processed and stored within compliant infrastructure.</li>
                <li><strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> — We process data only for the purposes consented to by you, and provide mechanisms for withdrawal of consent.</li>
              </ul>
            </section>

            <section id="contact">
              <h2>7. Contact &amp; Grievance Officer</h2>
              <p>For any privacy-related queries, data requests, or complaints:</p>
              <ul className="list-disc">
                <li><strong>Email:</strong> privacy@fintler.app</li>
                <li><strong>Grievance Officer:</strong> FintLer Privacy Team, privacy@fintler.app</li>
                <li><strong>Response Time:</strong> We aim to respond within 48 hours and resolve queries within 30 days as per SPDI Rules.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
