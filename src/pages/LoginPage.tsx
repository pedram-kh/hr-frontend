import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { ApiError, requestCode, verifyCode } from '../lib/api';

type Step = 'email' | 'code';

export function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestCode(email.trim());
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send the code. Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await verifyCode(email.trim(), code.trim());
      login(res.token, res.identity);
      navigate(res.identity.account_type === 'admin' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't match. Request a new one and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <div className="card">
        <h1>HR Platform</h1>
        <p className="muted">Sign in with a one-time email code (email OTP).</p>

        {step === 'email' && (
          <form className="login-form" onSubmit={onRequestCode}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form className="login-form" onSubmit={onVerifyCode}>
            <p className="muted">
              We sent a 6-digit code to <strong>{email}</strong>. In local dev it is visible in
              MailHog at <code>localhost:8025</code>.
            </p>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input
                id="code"
                className="input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
