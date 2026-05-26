import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function TermsOfService() {
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
              <h1 className="text-headline-lg text-on-surface mb-2">Terms of Service</h1>
              <p className="text-label-caps text-on-surface-variant/60">
                Last updated: May 26, 2026 &middot; Version 1.0
              </p>
            </div>

            <nav className="mb-10 p-4 rounded-lg bg-surface-container-low/50 border border-white/5">
              <div className="text-label-caps text-on-surface-variant/60 mb-3">Contents</div>
              <ol className="list-decimal list-inside space-y-1 text-body-sm text-tertiary">
                <li><a href="#acceptance">Acceptance of Terms</a></li>
                <li><a href="#service">Service Description</a></li>
                <li><a href="#eligibility">Eligibility</a></li>
                <li><a href="#user-obligations">User Obligations</a></li>
                <li><a href="#early-access">Early Access &amp; Beta Disclaimer</a></li>
                <li><a href="#ip">Intellectual Property</a></li>
                <li><a href="#liability">Limitation of Liability</a></li>
                <li><a href="#data">Data Handling</a></li>
                <li><a href="#termination">Termination</a></li>
                <li><a href="#governing-law">Governing Law</a></li>
                <li><a href="#changes">Changes to Terms</a></li>
              </ol>
            </nav>

            <section id="acceptance">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By checking the consent checkbox and signing in with your Google account, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our{" "}
                <Link to="/privacy" className="text-tertiary underline underline-offset-2 hover:opacity-80 transition-opacity">Privacy Policy</Link>.
                If you do not agree to these terms, do not use the service.
              </p>
            </section>

            <section id="service">
              <h2>2. Service Description</h2>
              <p>FintLer is a personal finance intelligence platform that:</p>
              <ul className="list-disc">
                <li>Reads bank transaction alert emails from your Gmail inbox (read-only access).</li>
                <li>Parses and categorizes transactions automatically using AI.</li>
                <li>Provides a visual dashboard with spending breakdowns, trends, and AI-generated financial insights.</li>
              </ul>
              <p>
                FintLer is <strong>not</strong> a bank, financial advisor, investment platform, or licensed financial intermediary. It is an informational tool to help you understand your personal spending patterns.
              </p>
            </section>

            <section id="eligibility">
              <h2>3. Eligibility</h2>
              <p>To use FintLer, you must:</p>
              <ul className="list-disc">
                <li>Be at least <strong>18 years of age</strong>.</li>
                <li>Have a valid Google account.</li>
                <li>Be the authorized owner of the Gmail account you connect.</li>
                <li>Provide accurate and complete information during registration.</li>
              </ul>
            </section>

            <section id="user-obligations">
              <h2>4. User Obligations</h2>
              <p>You agree to:</p>
              <ul className="list-disc">
                <li>Use the service only for personal, non-commercial purposes.</li>
                <li>Not attempt to reverse-engineer, decompile, or exploit the service.</li>
                <li>Not use the service for any unlawful purpose.</li>
                <li>Not share your account access with others.</li>
                <li>Report any security vulnerabilities or unauthorized access promptly to our team.</li>
              </ul>
            </section>

            <section id="early-access">
              <h2>5. Early Access &amp; Beta Disclaimer</h2>
              <p>
                FintLer is currently in <strong>early access (beta)</strong>. By using the service, you acknowledge:
              </p>
              <ul className="list-disc">
                <li>Features may change, be added, or be removed without prior notice.</li>
                <li>The service may contain bugs or produce inaccurate categorizations or insights.</li>
                <li>We do <strong>not</strong> guarantee 100% uptime or uninterrupted service.</li>
                <li>Your feedback may be used to improve the product (without exposing your personal financial data).</li>
                <li>We may limit the number of early access users at our discretion.</li>
              </ul>
            </section>

            <section id="ip">
              <h2>6. Intellectual Property</h2>
              <ul className="list-disc">
                <li><strong>FintLer Platform:</strong> All code, design, AI models, branding, and documentation are the intellectual property of FintLer and its creators.</li>
                <li><strong>Your Data:</strong> You retain full ownership of your personal financial data. We do not claim any ownership over your transactions or financial information.</li>
              </ul>
            </section>

            <section id="liability">
              <h2>7. Limitation of Liability</h2>
              <p>To the maximum extent permitted by Indian law:</p>
              <ul className="list-disc">
                <li>FintLer provides the service <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind.</li>
                <li>We are <strong>not liable</strong> for any financial decisions you make based on FintLer's insights, categorizations, or AI-generated analysis.</li>
                <li>AI-generated outputs are for <strong>informational purposes only</strong> and should not be treated as financial advice.</li>
                <li>We are not responsible for any inaccuracies in transaction parsing caused by non-standard email formats from your bank.</li>
                <li>Our total liability to you shall not exceed ₹1,000 (INR One Thousand) in aggregate.</li>
              </ul>
            </section>

            <section id="data">
              <h2>8. Data Handling</h2>
              <p>
                Your data is handled in accordance with our{" "}
                <Link to="/privacy" className="text-tertiary underline underline-offset-2 hover:opacity-80 transition-opacity">Privacy Policy</Link>.
                We comply with Google's API Services User Data Policy including the Limited Use requirements. We request only <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">gmail.readonly</code> scope — we cannot modify, send, or delete your emails.
              </p>
            </section>

            <section id="termination">
              <h2>9. Termination</h2>
              <ul className="list-disc">
                <li><strong>By You:</strong> You may stop using the service at any time. To delete your account and all associated data, email privacy@fintler.app. We will process deletion within 30 days.</li>
                <li><strong>By FintLer:</strong> We reserve the right to suspend or terminate access for violation of these terms, abuse of the service, or at our discretion during the early access period.</li>
                <li><strong>Effect of Termination:</strong> Upon termination, we will delete your parsed transaction data within 30 days. You may request a data export before termination.</li>
              </ul>
            </section>

            <section id="governing-law">
              <h2>10. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.
              </p>
            </section>

            <section id="changes">
              <h2>11. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. For material changes, we will provide at least <strong>15 days' notice</strong> via email to the address associated with your account. Continued use of the service after the notice period constitutes acceptance of the updated terms.
              </p>
            </section>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
