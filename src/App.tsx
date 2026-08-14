import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Workshop } from "./pages/Workshop";
import { Account } from "./pages/Account";
import { AdminConsole } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { Login, Signup } from "./pages/Auth";
import { VerifyEmail } from "./pages/VerifyEmail";
import { useAuthStore } from "./store/authStore";
import { useCatalogStore } from "./store/catalogStore";
import { setTrackedPath, startWorkspaceSync } from "./sync/workspaceSync";
import { SiteBanner } from "./components/layout/SiteBanner";
import { APP_BASE } from "./appBase";

function SessionTracker() {
  const location = useLocation();
  useEffect(() => {
    setTrackedPath(location.pathname);
  }, [location.pathname]);
  return null;
}

function Bootstrap() {
  useEffect(() => {
    startWorkspaceSync();
    void useCatalogStore.getState().load();
    void useAuthStore.getState().bootstrap();
  }, []);
  return null;
}

export default function App() {
  return (
    <div className="app-root">
      <BrowserRouter basename={APP_BASE || undefined}>
        <Bootstrap />
        <SessionTracker />
        <SiteBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workshop" element={<Workshop />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
