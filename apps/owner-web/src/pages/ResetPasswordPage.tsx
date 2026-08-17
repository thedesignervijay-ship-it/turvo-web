import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import type { FieldErrors } from '../validations/validators.js';

/**
 * Landing page for the password-reset flow. Supabase navigates the user here
 * with a recovery token in the URL fragment; we exchange it via
 * updateUser to set the new password (spec section 5).
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data.session) throw new Error('The reset link is invalid or has expired.');
        setReady(true);
      })
      .catch((err: unknown) => {
        setFlowError(err instanceof Error ? err.message : 'Unable to validate the reset link.');
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFlowError(null);
    const fieldErrors: FieldErrors = {};
    if (!password || password.length < 8) fieldErrors.password = 'Password must be at least 8 characters.';
    if (confirm !== password) fieldErrors.confirm = 'Passwords do not match.';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Unable to reset the password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__title">Reset password</h1>
          <p className="auth-card__subtitle">Choose a new password for your owner account.</p>
        </div>
        {flowError && !ready ? (
          <p className="auth-form__error" role="alert">
            {flowError}
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Field label="New password" error={errors.password}>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                invalid={Boolean(errors.password)}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm password" error={errors.confirm}>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                invalid={Boolean(errors.confirm)}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            {flowError && (
              <p className="auth-form__error" role="alert">
                {flowError}
              </p>
            )}
            <Button type="submit" loading={submitting} className="auth-form__submit">
              Reset password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
