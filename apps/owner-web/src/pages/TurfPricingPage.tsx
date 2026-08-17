import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { getTurf } from '../services/turfs.service.js';
import { listCourts } from '../services/courts.service.js';
import { listPricingRules, createPricingRule, updatePricingRule, setPricingRuleStatus } from '../services/pricing.service.js';
import { validatePricingRule } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import type { CourtDto, PricingRuleDto, TurfDetailDto } from '../types/domain.js';
import { formatCurrency, formatDate, statusLabel } from '../lib/format.js';
import type { DayType } from '@turvo/shared';

interface FormValues {
  courtId: string;
  startTime: string;
  endTime: string;
  dayType: DayType | '';
  price: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const emptyForm: FormValues = {
  courtId: '',
  startTime: '',
  endTime: '',
  dayType: '',
  price: '',
  effectiveFrom: '',
  effectiveTo: '',
};

export function TurfPricingPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [rules, setRules] = useState<PricingRuleDto[]>([]);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRuleDto | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, p, c] = await Promise.all([getTurf(id!), listPricingRules(id!), listCourts(id!)]);
      setTurf(t);
      setRules(p);
      setCourts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pricing rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (rule: PricingRuleDto) => {
    setEditing(rule);
    setValues({
      courtId: rule.courtId ?? '',
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
      dayType: rule.dayType,
      price: String(rule.price),
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validatePricingRule(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      const payload = {
        courtId: values.courtId || undefined,
        startTime: values.startTime,
        endTime: values.endTime,
        dayType: values.dayType as DayType,
        price: Number(values.price),
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || null,
      };
      if (editing) {
        await updatePricingRule(editing.id, payload);
        toast.success('Pricing rule updated.');
      } else {
        await createPricingRule(id!, payload);
        toast.success('Pricing rule created.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save the pricing rule.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (rule: PricingRuleDto) => {
    const next = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    confirm({
      title: next === 'ACTIVE' ? 'Activate pricing rule' : 'Deactivate pricing rule',
      message: `${next === 'ACTIVE' ? 'Activate' : 'Deactivate'} this pricing rule for new bookings?`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      tone: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await setPricingRuleStatus(rule.id, next);
          toast.success(`Pricing rule ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to update pricing rule status.');
        }
      },
    });
  };

  const courtLabel = (courtId: string | null) =>
    courtId ? courts.find((c) => c.id === courtId)?.name ?? '—' : 'All courts';

  const columns: Column<PricingRuleDto>[] = [
    { key: 'court', header: 'Court', render: (r) => courtLabel(r.courtId) },
    { key: 'time', header: 'Time', render: (r) => `${r.startTime.slice(0, 5)}–${r.endTime.slice(0, 5)}` },
    { key: 'dayType', header: 'Days', render: (r) => statusLabel(r.dayType) },
    { key: 'price', header: 'Price', render: (r) => formatCurrency(r.price) },
    { key: 'effective', header: 'Effective', render: (r) => `${formatDate(r.effectiveFrom)}${r.effectiveTo ? ` → ${formatDate(r.effectiveTo)}` : ''}` },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="row-actions">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Spinner />;
  if (error || !turf) return <ErrorState message={error ?? 'Turf not found.'} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={`Pricing · ${turf.name}`}
        subtitle="Define per-slot prices for weekdays and weekends. Leave the court empty to apply to the whole turf."
        actions={
          <>
            <Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>
            <Button onClick={openCreate}>Add pricing rule</Button>
          </>
        }
      />

      {rules.length === 0 ? (
        <EmptyState title="No pricing rules yet" message="Add pricing so customers see slot prices when booking." />
      ) : (
        <DataTable columns={columns} rows={rules} rowKey={(r) => r.id} emptyTitle="No pricing rules" />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit pricing rule' : 'Add pricing rule'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Save changes' : 'Create rule'}</Button>
          </>
        }
      >
        <form onSubmit={handleSave} noValidate>
          <Field label="Court" error={errors.courtId} hint="Optional — leave empty for the whole turf.">
            <Select value={values.courtId} onChange={(e) => setValues((v) => ({ ...v, courtId: e.target.value }))}>
              <option value="">All courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label="Start time" error={errors.startTime} required>
              <Input type="time" value={values.startTime} invalid={Boolean(errors.startTime)} onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))} />
            </Field>
            <Field label="End time" error={errors.endTime} required>
              <Input type="time" value={values.endTime} invalid={Boolean(errors.endTime)} onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Day type" error={errors.dayType} required>
              <Select value={values.dayType} invalid={Boolean(errors.dayType)} onChange={(e) => setValues((v) => ({ ...v, dayType: e.target.value as DayType }))}>
                <option value="">Select…</option>
                <option value="WEEKDAY">Weekdays</option>
                <option value="WEEKEND">Weekends</option>
              </Select>
            </Field>
            <Field label="Price (₹)" error={errors.price} required>
              <Input type="number" min={0} step="0.01" value={values.price} invalid={Boolean(errors.price)} onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Effective from" error={errors.effectiveFrom} required>
              <Input type="date" value={values.effectiveFrom} invalid={Boolean(errors.effectiveFrom)} onChange={(e) => setValues((v) => ({ ...v, effectiveFrom: e.target.value }))} />
            </Field>
            <Field label="Effective to" error={errors.effectiveTo} hint="Optional — leave empty for no end date.">
              <Input type="date" value={values.effectiveTo} invalid={Boolean(errors.effectiveTo)} onChange={(e) => setValues((v) => ({ ...v, effectiveTo: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Modal>

      {dialog}
    </div>
  );
}
