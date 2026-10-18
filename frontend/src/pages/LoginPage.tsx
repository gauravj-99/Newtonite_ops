import { Activity, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export const LoginPage = () => {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-brand"><div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div><span>newtonite<span className="brand-ops">ops</span></span></div>
        <div className="login-message">
          <div className="eyebrow"><span className="eyebrow-line" /> BUILT FOR THE WORK THAT MATTERS</div>
          <h1>Operations,<br /><span>in motion.</span></h1>
          <p>One clear view of your team's work, priorities, and progress. Get in, get aligned, get things moving.</p>
          <div className="login-proof"><div className="proof-avatars"><span>JD</span><span>AK</span><span>MR</span><span>+</span></div><span>Trusted by teams that keep things running.</span></div>
        </div>
        <div className="login-left-footer"><span>© 2026 Newtonite Ops</span><span>Secure internal access</span></div>
      </div>
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><div className="brand-mark"><Activity size={18} /></div><span>newtonite<span className="brand-ops">ops</span></span></div>
          <div className="login-heading">
            <div className="login-lock"><LockKeyhole size={19} /></div>
            <div className="eyebrow text-indigo">WELCOME BACK</div>
            <h2>Sign in to your workspace</h2>
            <p>Enter your credentials to access your operations dashboard.</p>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <div className="input-wrap"><Mail size={17} /><input id="email" type="email" placeholder="you@company.com" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="password-label"><label htmlFor="password">Password</label><a href="mailto:it@newtonite.com?subject=Password%20reset">Forgot password?</a></div>
            <div className="input-wrap"><LockKeyhole size={17} /><input id="password" type="password" placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            <button className="primary-button login-submit" type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </form>
          <div className="login-secure"><LockKeyhole size={14} /><span>Protected by enterprise-grade security</span></div>
          <div className="login-help">Need access? <a href="mailto:it@newtonite.com">Contact your administrator</a></div>
        </div>
        <div className="login-right-footer"><span>Privacy</span><span>Terms</span><span>Help & Support</span></div>
      </div>
    </div>
  );
};
