import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { validateLogin } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setApiError(null);
    const fieldErrors = validateLogin({ email, password });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__title">Turvo Admin</h1>
          <p className="auth-card__subtitle">Sign in to manage turf owners, turfs and bookings.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              invalid={Boolean(errors.email)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              invalid={Boolean(errors.password)}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {apiError && (
            <p className="auth-form__error" role="alert">
              {apiError}
            </p>
          )}
          <Button type="submit" loading={submitting} className="auth-form__submit">
            Sign in
          </Button>
        </form>
        <p className="auth-card__links">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
