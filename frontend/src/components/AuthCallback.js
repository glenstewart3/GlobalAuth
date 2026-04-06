import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API_BASE } from "../contexts/AuthContext";
import axios from "axios";

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    // useRef prevents double-execution under React StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    // Exchange the Emergent Auth session_id for an MPS Auth JWT
    axios
      .post(`${API_BASE}/google/callback/`, { session_id: sessionId }, { withCredentials: true })
      .then(async () => {
        // Refresh token cookie is now set — restore full auth state
        await refreshAuth();
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        const detail = err.response?.data?.detail || "Google sign-in failed";
        navigate(`/login?error=${encodeURIComponent(detail)}`, { replace: true });
      });
  }, [navigate, refreshAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Signing in with Google…</span>
      </div>
    </div>
  );
}
