import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../auth/AuthContext.js';
import { validateProfile } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { formatDateTime } from '../lib/format.js';
import { useToast } from '../components/ui/Toast.js';

export function ProfilePage() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me) {
      setName(me.user.name);
      setPhone(me.user.phone);
      setLoading(false);
    }
  }, [me]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validateProfile({ name, phone });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      const { updateProfile } = await import('../services/profile.service.js');
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      await refreshMe();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !me) return <Spinner />;
  if (!me) return <ErrorState message="Unable to load your profile." />;

  return (
    <div>
      <PageHeader title="Profile" subtitle={`Signed in as ${me.user.email}`} />

      <div className="detail-grid">
        <section className="panel" aria-label="Edit profile">
          <h2 className="panel__title">Edit profile</h2>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Field label="Name" error={errors.name} required>
              <Input
                value={name}
                invalid={Boolean(errors.name)}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Phone" error={errors.phone} hint="10-15 digits, optional leading +.">
              <Input
                value={phone}
                invalid={Boolean(errors.phone)}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </section>

        <section className="panel" aria-label="Account details">
          <h2 className="panel__title">Account details</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Name</dt><dd>{me.user.name}</dd></div>
            <div className="detail-list__row"><dt>Email</dt><dd>{me.user.email}</dd></div>
            <div className="detail-list__row"><dt>Phone</dt><dd>{me.user.phone}</dd></div>
            <div className="detail-list__row"><dt>Role</dt><dd>Admin</dd></div>
            <div className="detail-list__row"><dt>Last login</dt><dd>{formatDateTime(me.user.lastLoginAt)}</dd></div>
            <div className="detail-list__row"><dt>Member since</dt><dd>{formatDateTime(me.user.createdAt)}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
