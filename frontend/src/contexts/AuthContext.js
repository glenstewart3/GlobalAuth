import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API_PREFIX = process.env.REACT_APP_API_PREFIX || "/auth/api";
export const API_BASE = `${BACKEND}${API_PREFIX}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await axios.post(`${API_BASE}/token/refresh/`, {}, { withCredentials: true });
      const token = res.data.access_token;
      setAccessToken(token);
      const verifyRes = await axios.get(`${API_BASE}/verify/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(verifyRes.data.user);
      return token;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from Google OAuth, skip the token refresh.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/login/`, { email, password }, { withCredentials: true });
    const token = res.data.access_token;
    setAccessToken(token);
    const verifyRes = await axios.get(`${API_BASE}/verify/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(verifyRes.data.user);
    return { ...verifyRes.data, access_token: token };
  };

  const logout = async () => {
    try {
      await axios.post(
        `${API_BASE}/logout/`,
        {},
        {
          withCredentials: true,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }
      );
    } catch {
      // swallow logout errors
    }
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshAuth, API: API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
