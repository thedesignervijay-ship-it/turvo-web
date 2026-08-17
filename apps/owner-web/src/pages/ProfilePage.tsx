import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../auth/AuthContext.js';
import { validateProfile, validateBusinessProfile } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { formatDateTime } from '../lib/format.js';
import { useToast } from '../components/ui/Toast.js';
import { getProfile, updateProfile, updateBusinessProfile } from '../services/profile.service.js';
import type { OwnerDto } from '../types/domain.js';

const emptyBusiness = {
  businessName: '',
  businessPhone: '',
  businessEmail: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
};

export function ProfilePage() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [personalErrors, setPersonalErrors] = useState<FieldErrors>({});
  const [business, setBusiness] = useState(emptyBusiness);
  const [businessErrors, setBusinessErrors] = useState<FieldErrors>({});
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<OwnerDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile();
        if (cancelled) return;
        const o = profile.owner;
        setName(profile.user.name);
        setPhone(profile.user.phone);
        setOwner(o);
        if (o) {
          setBusiness({
            businessName: o.businessName,
            businessPhone: o.businessPhone,
            businessEmail: o.businessEmail ?? '',
            addressLine1: o.addressLine1,
            addressLine2: o.addressLine2 ?? '',
            city: o.city,
            state: o.state,
            pincode: o.pincode,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePersonal = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validateProfile({ name, phone });
    setPersonalErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSavingPersonal(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      await refreshMe();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveBusiness = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validateBusinessProfile(business);
    setBusinessErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSavingBusiness(true);
    try {
      await updateBusinessProfile({
        businessName: business.businessName.trim(),
        businessPhone: business.businessPhone.trim(),
        businessEmail: business.businessEmail.trim() || null,
        addressLine1: business.addressLine1.trim(),
        addressLine2: business.addressLine2.trim() || null,
        city: business.city.trim(),
        state: business.state.trim(),
        pincode: business.pincode.trim(),
      });
      await refreshMe();
      toast.success('Business profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update business profile.');
    } finally {
      setSavingBusiness(false);
    }
  };

  if (loading) return <Spinner />;
  if (!me) return <ErrorState message="Unable to load your profile." />;

  const setBusinessField = (key: keyof typeof emptyBusiness) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusiness((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle={`Signed in as ${me.user.email}`} />

      <div className="detail-grid">
        <section className="panel" aria-label="Edit personal profile">
          <h2 className="panel__title">Personal details</h2>
          <form className="auth-form" onSubmit={savePersonal} noValidate>
            <Field label="Name" error={personalErrors.name} required>
              <Input value={name} invalid={Boolean(personalErrors.name)} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone" error={personalErrors.phone} hint="10-15 digits, optional leading +.">
              <Input value={phone} invalid={Boolean(personalErrors.phone)} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Button type="submit" loading={savingPersonal}>Save changes</Button>
          </form>
        </section>

        <section className="panel" aria-label="Account details">
          <h2 className="panel__title">Account details</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Name</dt><dd>{me.user.name}</dd></div>
            <div className="detail-list__row"><dt>Email</dt><dd>{me.user.email}</dd></div>
            <div className="detail-list__row"><dt>Phone</dt><dd>{me.user.phone}</dd></div>
            <div className="detail-list__row"><dt>Role</dt><dd>Owner</dd></div>
            {me.owner && (
              <div className="detail-list__row"><dt>Business</dt><dd>{me.owner.businessName}</dd></div>
            )}
            <div className="detail-list__row"><dt>Last login</dt><dd>{formatDateTime(me.user.lastLoginAt)}</dd></div>
            <div className="detail-list__row"><dt>Member since</dt><dd>{formatDateTime(me.user.createdAt)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="panel" aria-label="Edit business profile">
        <h2 className="panel__title">Business details</h2>
        <form className="auth-form" onSubmit={saveBusiness} noValidate>
          <div className="form-grid">
            <Field label="Business name" error={businessErrors.businessName} required>
              <Input value={business.businessName} invalid={Boolean(businessErrors.businessName)} onChange={setBusinessField('businessName')} />
            </Field>
            <Field label="Business phone" error={businessErrors.businessPhone} required>
              <Input type="tel" value={business.businessPhone} invalid={Boolean(businessErrors.businessPhone)} onChange={setBusinessField('businessPhone')} />
            </Field>
          </div>
          <Field label="Business email" error={businessErrors.businessEmail}>
            <Input type="email" value={business.businessEmail} invalid={Boolean(businessErrors.businessEmail)} onChange={setBusinessField('businessEmail')} />
          </Field>
          <div className="form-grid">
            <Field label="Address line 1" error={businessErrors.addressLine1} required>
              <Input value={business.addressLine1} invalid={Boolean(businessErrors.addressLine1)} onChange={setBusinessField('addressLine1')} />
            </Field>
            <Field label="Address line 2" error={businessErrors.addressLine2}>
              <Input value={business.addressLine2} invalid={Boolean(businessErrors.addressLine2)} onChange={setBusinessField('addressLine2')} />
            </Field>
          </div>
          <div className="form-grid form-grid--3">
            <Field label="City" error={businessErrors.city} required>
              <Input value={business.city} invalid={Boolean(businessErrors.city)} onChange={setBusinessField('city')} />
            </Field>
            <Field label="State" error={businessErrors.state} required>
              <Input value={business.state} invalid={Boolean(businessErrors.state)} onChange={setBusinessField('state')} />
            </Field>
            <Field label="Pincode" error={businessErrors.pincode} required>
              <Input value={business.pincode} invalid={Boolean(businessErrors.pincode)} onChange={setBusinessField('pincode')} />
            </Field>
          </div>
          {!owner && (
            <p className="alert alert--info">Business details are shown to admins on your turfs. {business.businessName ? '' : 'Add them to complete your profile.'}</p>
          )}
          <Button type="submit" loading={savingBusiness}>Save business details</Button>
        </form>
      </section>
    </div>
  );
}
