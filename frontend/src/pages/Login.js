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

  // "checking" covers both the auth refresh AND the onboarding status call.
  // The login form is only shown once we know for certain that onboarding is done.
  const [checking, setChecking] = useState(true);

  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // AuthContext still restoring session — wait

    if (user) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Session not found. Check whether first-time setup has been done.
    axios
      .get(`${API_BASE}/onboarding/status`)
      .then((res) => {
        if (res.data.needs_onboarding) {
          navigate("/onboarding", { replace: true });
        } else {
          setChecking(false); // onboarding done — show the login form
        }
      })
      .catch(() => {
        // API unreachable — show login form and let the user try
        setChecking(false);
      });
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg || d).join(", ")
          : "Invalid email or password"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Full-screen spinner while we decide what to show
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
          {/* Brand */}
          <div className="flex items-center gap-2 mb-10">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-heading font-black text-xl tracking-tight">MPS Auth</span>
          </div>

          <h1 className="text-4xl tracking-tight font-bold font-heading mb-1">Sign in</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Centralised authentication portal for MPS apps
          </p>

          {error && (
            <div
              className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-sm text-destructive"
              data-testid="login-error-message"
            >
              {error}
            </div>
          )}

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
