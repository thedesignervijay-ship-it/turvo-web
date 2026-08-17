import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { validateForgotPassword } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setApiError(null);
    const fieldErrors = validateForgotPassword({ email });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw new Error(error.message);
      setMessage(
        'If an account exists for that email, a password reset link has been sent. Please check your inbox.',
      );
      setEmail('');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to send the reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__title">Forgot password</h1>
          <p className="auth-card__subtitle">
            Enter your owner email and we will send you a link to reset your password.
          </p>
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
          {message && (
            <p className="auth-form__success" role="status">
              {message}
            </p>
          )}
          {apiError && (
            <p className="auth-form__error" role="alert">
              {apiError}
            </p>
          )}
          <Button type="submit" loading={submitting} className="auth-form__submit">
            Send reset link
          </Button>
        </form>
        <p className="auth-card__links">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
