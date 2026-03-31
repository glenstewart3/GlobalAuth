import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API_BASE } from "../contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import axios from "axios";

const STEPS = ["Create Admin Account", "Confirmation"];

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/onboarding/status`)
      .then((res) => {
        if (!res.data.needs_onboarding) navigate("/login", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  }, [navigate]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/onboarding/setup`, {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      });
      setStep(1);
      toast.success("Admin account created!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Setup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground mb-1.5">
        {label}
      </label>
      {key === "password" || key === "confirm" ? (
        <div className="relative">
          <input
            type={showPassword ? "text" : type}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            placeholder={placeholder}
            className={`w-full h-10 px-3 pr-10 rounded-sm border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              errors[key] ? "border-destructive" : "border-input"
            }`}
            data-testid={`onboarding-${key}-input`}
          />
          {key === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className={`w-full h-10 px-3 rounded-sm border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            errors[key] ? "border-destructive" : "border-input"
          }`}
          data-testid={`onboarding-${key}-input`}
        />
      )}
      {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-heading font-black text-xl tracking-tight">MPS Auth</span>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-primary text-white"
                    : i === step
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  i === step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-sm p-8 shadow-none">
          {step === 0 && (
            <>
              <h1 className="text-2xl font-heading font-bold tracking-tight mb-1">
                Set up your admin account
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                This will be the first administrator for MPS Auth. You can create more accounts after login.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {field("full_name", "Full name", "text", "Jane Smith")}
                {field("email", "Email address", "email", "admin@school.edu.au")}
                {field("password", "Password", "password", "Min. 8 characters")}
                {field("confirm", "Confirm password", "password", "Repeat password")}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
                  data-testid="onboarding-submit-button"
                >
                  {submitting ? "Creating account…" : "Create admin account"}
                </button>
              </form>
            </>
          )}

          {step === 1 && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold mb-2">You're all set!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Admin account for <strong>{form.email}</strong> has been created. Sign in to continue.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="h-10 px-6 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors"
                data-testid="onboarding-goto-login-button"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
