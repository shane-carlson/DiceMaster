import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Workshop } from "./pages/Workshop";
import { Account } from "./pages/Account";
import { Login, Signup } from "./pages/Auth";
import { useAuthStore } from "./store/authStore";
import { setTrackedPath, startWorkspaceSync } from "./sync/workspaceSync";

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
    void useAuthStore.getState().bootstrap();
  }, []);
  return null;
}

export default function App() {
  return (
    <div className="app-root">
      <div className="grain" />
      <BrowserRouter>
        <Bootstrap />
        <SessionTracker />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workshop" element={<Workshop />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
