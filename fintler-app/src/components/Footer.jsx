import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-white/5 bg-black mt-auto z-10 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-gutter)] px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto">
        <div className="flex flex-col items-start">
          <div className="text-label-caps text-on-surface-variant opacity-50 mb-4">
            FINTLER
          </div>
          <div className="text-body-sm text-on-surface-variant">
            © 2024–2026 FintLer AI. Precision Clarity for Indian Markets.
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end items-center">
          <Link
            to="/privacy"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            Terms of Service
          </Link>
          <a
            href="#"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            Merchant Directory
          </a>
          <a
            href="#"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            API Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
