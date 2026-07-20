import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import BottomTabBar from "./components/BottomTabBar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Syncing from "./pages/Syncing";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AuthCallback from "./pages/AuthCallback";
import Analytics from "./pages/Analytics";
import Assets from "./pages/Assets";
import ImportPage from "./pages/ImportPage";
import Waitlist from "./pages/Waitlist";
import NotFound from "./pages/NotFound";

const dashboardRoutes = ["/dashboard", "/analytics", "/assets", "/import"];

function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDashboard = dashboardRoutes.includes(location.pathname) && user;

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-halo-text)" }}>
      {isDashboard && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      {/* Show top navbar only on non-dashboard pages */}
      {!isDashboard && <Navbar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/sync" element={<ProtectedRoute><Syncing /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>

      {isDashboard && <BottomTabBar />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
