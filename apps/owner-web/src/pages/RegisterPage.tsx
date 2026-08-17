import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { validateRegister } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { registerOwner } from '../services/auth.service.js';

const initial = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  businessName: '',
  businessPhone: '',
  businessEmail: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof initial) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setApiError(null);
    const fieldErrors = validateRegister(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSubmitting(true);
    try {
      await registerOwner({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim(),
        businessName: values.businessName.trim(),
        businessPhone: values.businessPhone.trim(),
        businessEmail: values.businessEmail.trim() || null,
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2.trim() || null,
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
      });
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__title">Create your owner account</h1>
          <p className="auth-card__subtitle">
            Register your turf business to start onboarding turfs, courts and pricing.
          </p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Field label="Your name" error={errors.name} required>
            <Input value={values.name} invalid={Boolean(errors.name)} onChange={set('name')} autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.email} required>
            <Input type="email" autoComplete="email" value={values.email} invalid={Boolean(errors.email)} onChange={set('email')} />
          </Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters." required>
            <Input type="password" autoComplete="new-password" value={values.password} invalid={Boolean(errors.password)} onChange={set('password')} />
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword} required>
            <Input type="password" autoComplete="new-password" value={values.confirmPassword} invalid={Boolean(errors.confirmPassword)} onChange={set('confirmPassword')} />
          </Field>
          <Field label="Phone" error={errors.phone} hint="10-15 digits, optional leading +." required>
            <Input type="tel" autoComplete="tel" value={values.phone} invalid={Boolean(errors.phone)} onChange={set('phone')} />
          </Field>

          <h2 className="auth-card__subtitle" style={{ margin: '1rem 0 0.25rem', fontWeight: 600 }}>
            Business details
          </h2>
          <Field label="Business name" error={errors.businessName} required>
            <Input value={values.businessName} invalid={Boolean(errors.businessName)} onChange={set('businessName')} />
          </Field>
          <Field label="Business phone" error={errors.businessPhone} required>
            <Input type="tel" value={values.businessPhone} invalid={Boolean(errors.businessPhone)} onChange={set('businessPhone')} />
          </Field>
          <Field label="Business email" error={errors.businessEmail}>
            <Input type="email" value={values.businessEmail} invalid={Boolean(errors.businessEmail)} onChange={set('businessEmail')} />
          </Field>
          <Field label="Address line 1" error={errors.addressLine1} required>
            <Input value={values.addressLine1} invalid={Boolean(errors.addressLine1)} onChange={set('addressLine1')} />
          </Field>
          <Field label="Address line 2" error={errors.addressLine2}>
            <Input value={values.addressLine2} invalid={Boolean(errors.addressLine2)} onChange={set('addressLine2')} />
          </Field>
          <Field label="City" error={errors.city} required>
            <Input value={values.city} invalid={Boolean(errors.city)} onChange={set('city')} />
          </Field>
          <Field label="State" error={errors.state} required>
            <Input value={values.state} invalid={Boolean(errors.state)} onChange={set('state')} />
          </Field>
          <Field label="Pincode" error={errors.pincode} required>
            <Input value={values.pincode} invalid={Boolean(errors.pincode)} onChange={set('pincode')} />
          </Field>

          {apiError && (
            <p className="auth-form__error" role="alert">
              {apiError}
            </p>
          )}
          <Button type="submit" loading={submitting} className="auth-form__submit">
            Create account
          </Button>
        </form>
        <p className="auth-card__links">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
