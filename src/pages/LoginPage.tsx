import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { ApiError, requestCode, verifyCode } from '../lib/api';
import { useT } from '../i18n/context';

type Step = 'email' | 'code';

export function LoginPage() {
  const t = useT();
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
      setError(err instanceof ApiError ? err.message : t.login.emailRequestFailed);
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
      setError(err instanceof ApiError ? err.message : t.login.codeVerifyFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <div className="card">
        <h1>{t.brand.productName}</h1>
        <p className="muted">{t.login.subtitle}</p>

        {step === 'email' && (
          <form className="login-form" onSubmit={onRequestCode}>
            <div className="field">
              <label htmlFor="email">{t.login.emailLabel}</label>
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
              {busy ? t.login.sendingButton : t.login.sendCodeButton}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form className="login-form" onSubmit={onVerifyCode}>
            <p className="muted">
              {t.login.codeSentPrefix} <strong>{email}</strong>{t.login.codeSentMailhogPrefix} <code>localhost:8025</code>{t.login.codeSentMailhogSuffix}
            </p>
            <div className="field">
              <label htmlFor="code">{t.login.codeLabel}</label>
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
              {busy ? t.login.verifyingButton : t.login.verifyAndSignInButton}
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
              {t.login.useDifferentEmailButton}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
