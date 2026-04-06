import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API_BASE } from "../contexts/AuthContext";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const appRedirect = searchParams.get("redirect");
  const googleError = searchParams.get("error");

  useEffect(() => {
    if (loading) return;
    if (user) { navigate("/dashboard", { replace: true }); return; }

    axios.get(`${API_BASE}/onboarding/status`)
      .then((res) => {
        if (res.data.needs_onboarding) navigate("/onboarding", { replace: true });
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = await login(email, password);
      if (appRedirect) {
        window.location.href = `${appRedirect}#mps_token=${data.access_token}`;
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || d).join(", ")
        : "Invalid email or password"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-heading font-black text-xl tracking-tight">MPS Auth</span>
          </div>

          <h1 className="text-4xl tracking-tight font-bold font-heading mb-1">Sign in</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {appRedirect ? "Sign in to continue to your app" : "Centralised authentication portal for MPS apps"}
          </p>

          {googleError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-sm text-destructive">
              {decodeURIComponent(googleError)}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-sm text-destructive" data-testid="login-error-message">
              {error}
            </div>
          )}

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-10 flex items-center justify-center gap-2 border border-border rounded-sm text-sm font-medium hover:bg-muted transition-colors mb-4"
            data-testid="google-login-button"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-muted-foreground">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-sm border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                placeholder="admin@school.edu.au"
                required
                autoComplete="email"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label className="block text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-sm border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                  required
                  autoComplete="current-password"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-login-button"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {/* Right — hero image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/3137083/pexels-photo-3137083.jpeg"
          alt="Architecture"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute bottom-8 left-8 text-white">
          <p className="text-xs tracking-[0.1em] uppercase font-semibold opacity-70 mb-1">
            Secure · Centralised · Audited
          </p>
          <p className="text-2xl font-heading font-bold leading-tight max-w-xs">
            One portal for every MPS application
          </p>
        </div>
      </div>
    </div>
  );
}
