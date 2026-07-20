import { Link, useLocation } from "react-router-dom";

const tabs = [
  { to: "/dashboard", label: "Home", icon: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" },
  { to: "/analytics", label: "Analytics", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { to: "/import", label: "Import", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" },
  { to: "/assets", label: "Assets", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <div className="tab-bar lg:hidden">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-all active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 transition-colors"
                 style={{ color: isActive ? "var(--color-halo-indigo)" : "var(--color-halo-text3)" }}>
              <path d={tab.icon} />
            </svg>
            <span className="text-[10px] font-medium transition-colors"
                  style={{ color: isActive ? "var(--color-halo-indigo)" : "var(--color-halo-text3)", fontWeight: isActive ? 600 : 500 }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
