import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" },
      { to: "/analytics", label: "Analytics", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
      { to: "/assets", label: "Assets", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
      { to: "/import", label: "Import", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/settings", label: "Settings", icon: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
  };

  return (
    <>
      {/* Overlay for tablet */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-[19] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold"
               style={{ background: "var(--color-halo-indigo)", color: "#fff" }}>
            F
          </div>
          <span className="text-base font-extrabold tracking-tight">FintLer</span>
        </div>

        {/* Nav sections */}
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="text-label-caps mt-6 mb-2">{section.section}</div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                    isActive
                      ? "text-[var(--color-halo-indigo)]"
                      : "text-[var(--color-halo-text2)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-halo-text)]"
                  }`}
                  style={isActive ? { background: "var(--color-halo-indigo-soft)" } : {}}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0" style={{ opacity: isActive ? 1 : 0.5 }}>
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User */}
        <div className="flex items-center gap-2.5 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
               style={{ background: "var(--color-elevated)", color: "var(--color-halo-indigo)" }}>
            {user?.user_metadata?.full_name
              ? user.user_metadata.full_name.substring(0, 2)
              : user?.email
              ? user.email.substring(0, 2)
              : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.user_metadata?.full_name || "User"}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--color-halo-text3)" }}>{user?.email || ""}</div>
          </div>
          <button onClick={handleSignOut} className="text-[10px] font-semibold px-2 py-1 rounded cursor-pointer border-none bg-transparent" style={{ color: "var(--color-halo-text3)" }}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
