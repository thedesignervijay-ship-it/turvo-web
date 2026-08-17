import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../components/ui/Toast.js';
import { listSettings, updateSettings } from '../services/settings.service.js';
import { validateSettingValue } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { formatDateTime } from '../lib/format.js';
import type { PlatformSettingDto } from '../types/domain.js';

interface EditableSetting {
  key: string;
  valueText: string;
  description: string | null;
}

function settingToForm(setting: PlatformSettingDto): EditableSetting {
  return {
    key: setting.key,
    valueText: JSON.stringify(setting.value),
    description: setting.description,
  };
}

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<PlatformSettingDto[]>([]);
  const [form, setForm] = useState<EditableSetting[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSettings();
      setSettings(result);
      setForm(result.map(settingToForm));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (index: number, patch: Partial<EditableSetting>) => {
    setForm((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const save = async () => {
    const nextErrors: FieldErrors = {};
    const payload: Array<{ key: string; value: unknown }> = [];
    for (const row of form) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.valueText || '""');
      } catch {
        nextErrors[row.key] = 'Must be valid JSON.';
        continue;
      }
      const err = validateSettingValue(parsed);
      if (err) {
        nextErrors[row.key] = err;
        continue;
      }
      payload.push({ key: row.key, value: parsed });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      const updated = await updateSettings(payload);
      setSettings(updated);
      setForm(updated.map(settingToForm));
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform-wide configuration."
        actions={
          <Button onClick={save} loading={saving}>Save changes</Button>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !settings.length ? (
        <Spinner />
      ) : (
        <section className="panel">
          <h2 className="panel__title">Platform settings</h2>
          {form.length === 0 ? (
            <p className="panel__hint">No settings have been configured yet.</p>
          ) : (
            <div className="settings-list">
              {form.map((row, index) => (
                <div key={row.key} className="settings-row">
                  <div className="settings-row__meta">
                    <strong>{row.key}</strong>
                    {row.description && <p className="cell-sub">{row.description}</p>}
                  </div>
                  <div className="settings-row__field">
                    <Input
                      type="text"
                      aria-label={`Value for ${row.key}`}
                      value={row.valueText}
                      invalid={Boolean(errors[row.key])}
                      onChange={(e) => updateRow(index, { valueText: e.target.value })}
                    />
                    {errors[row.key] && <p className="field__error" role="alert">{errors[row.key]}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="panel__hint">
            Values are stored as JSON. Use quotes for strings (e.g. {"\"60\""}) and plain numbers/true/false otherwise.
          </p>
        </section>
      )}

      {settings.length > 0 && (
        <section className="panel">
          <h2 className="panel__title">Last updated</h2>
          <dl className="detail-list">
            {settings.map((s) => (
              <div className="detail-list__row" key={s.key}>
                <dt>{s.key}</dt>
                <dd>{formatDateTime(s.updatedAt)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
