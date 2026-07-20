import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const dashboardLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/analytics", label: "Analytics" },
  { to: "/assets", label: "Assets" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, signInWithGoogle, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isDashboard = ["/dashboard", "/analytics", "/assets"].includes(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  const handleMobileNavigate = () => setMobileOpen(false);

  // Hide navbar on sync screen
  if (location.pathname === "/sync" || location.pathname === "/auth/callback") return null;

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
          <div className="hidden md:flex items-center gap-6 text-label-caps ml-12">
            {dashboardLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`${
                  location.pathname === link.to ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                } transition-colors`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-4">
          {isDashboard && user && (
            <button
              type="button"
              className="md:hidden btn-ghost w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-xl">{mobileOpen ? "close" : "menu"}</span>
            </button>
          )}
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
                onClick={handleSignOut}
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
      {isDashboard && user && mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl px-[var(--spacing-margin-mobile)] py-4">
          <div className="flex flex-col gap-3 text-label-caps">
            {dashboardLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleMobileNavigate}
                className={`${
                  location.pathname === link.to ? "text-on-surface" : "text-on-surface-variant"
                } py-2`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="text-left py-2 text-on-surface-variant text-label-caps"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
