import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const { user, signOut, signInWithGoogle, loading } = useAuth();
  const isDashboard = location.pathname === "/dashboard";

  // Hide navbar on sync screen
  if (location.pathname === "/sync") return null;

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center h-16 px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto">
        <Link
          to="/"
          className="text-headline-md font-bold tracking-tight text-on-surface hover:opacity-80 transition-opacity"
        >
          FintLer
        </Link>

        {isDashboard && (
          <div className="hidden md:flex gap-8">
            <a href="#" className="text-primary font-bold border-b-2 border-primary pb-1 text-headline-md">
              Dashboard
            </a>
            <a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-colors text-headline-md">
              Analytics
            </a>
            <a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-colors text-headline-md">
              Assets
            </a>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface-container-high animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-medium text-sm uppercase">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name.substring(0, 2)
                  : user?.email
                  ? user.email.substring(0, 2)
                  : "U"}
              </div>
              <button
                onClick={signOut}
                className="btn-ghost px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="btn-ghost px-4 py-2 rounded-lg text-body-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
