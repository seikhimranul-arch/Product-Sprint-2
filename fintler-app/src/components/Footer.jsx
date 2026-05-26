export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-white/5 bg-black mt-auto z-10 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-gutter)] px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto">
        <div className="flex flex-col items-start">
          <div className="text-label-caps text-on-surface-variant opacity-50 mb-4">
            FINTLER
          </div>
          <div className="text-body-sm text-on-surface-variant">
            © 2024 FintLer AI. Precision Clarity for Indian Markets.
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end items-center">
          <a
            href="#"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-body-sm text-on-surface-variant hover:text-tertiary transition-colors"
          >
            Terms of Service
          </a>
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
