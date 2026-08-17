import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useToast } from '../components/ui/Toast.js';
import { getTurf } from '../services/turfs.service.js';
import { listAllActiveItems } from '../services/masterData.service.js';
import { listTurfMasterItems, replaceTurfMasterItems } from '../services/turfMasterItems.service.js';
import type { MasterItemDto, TurfDetailDto } from '../types/domain.js';

type CategoryKey = 'FACILITIES' | 'RULES' | 'EQUIPMENT';

const CATEGORY_META: Record<CategoryKey, { title: string; hint: string }> = {
  FACILITIES: { title: 'Facilities', hint: 'e.g. floodlights, parking, changing rooms' },
  RULES: { title: 'Rules', hint: 'e.g. sports shoes required, no food on the pitch' },
  EQUIPMENT: { title: 'Equipment', hint: 'e.g. balls, nets, shin guards' },
};

export function TurfFeaturesPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [byCategory, setByCategory] = useState<Record<CategoryKey, MasterItemDto[]>>({
    FACILITIES: [],
    RULES: [],
    EQUIPMENT: [],
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, items, assigned] = await Promise.all([
          getTurf(id!),
          listAllActiveItems(),
          listTurfMasterItems(id!),
        ]);
        if (cancelled) return;
        setTurf(t);
        const grouped: Record<CategoryKey, MasterItemDto[]> = { FACILITIES: [], RULES: [], EQUIPMENT: [] };
        const sportItems: MasterItemDto[] = [];
        for (const item of items) {
          if (item.categoryCode === 'SPORTS') sportItems.push(item);
          else if (item.categoryCode in grouped) grouped[item.categoryCode as CategoryKey].push(item);
        }
        setSports(sportItems);
        setByCategory(grouped);
        const checked: Record<string, boolean> = {};
        for (const item of assigned) checked[item.id] = true;
        setSelected(checked);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load turf features.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggle = (itemId: string) => setSelected((prev) => ({ ...prev, [itemId]: !prev[itemId] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemIds = Object.entries(selected)
        .filter(([, on]) => on)
        .map(([itemId]) => itemId);
      await replaceTurfMasterItems(id!, itemIds);
      toast.success('Turf features updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save turf features.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error || !turf) return <ErrorState message={error ?? 'Turf not found.'} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader
        title="Sports, facilities & more"
        subtitle={`Manage what ${turf.name} offers. Sports are chosen when editing the turf; facilities, rules and equipment are selected here.`}
        actions={
          <>
            <Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>
            <Button loading={saving} onClick={handleSave}>Save features</Button>
          </>
        }
      />

      <section className="card">
        <h2 className="card__title">Sports</h2>
        <p className="card__hint">Managed in the turf editor.</p>
        {turf.sportIds.length > 0 ? (
          <div className="badge-row">
            {turf.sportIds.map((sportId) => {
              const sport = sports.find((s) => s.id === sportId);
              return <Badge key={sportId} tone="info">{sport?.name ?? sportId.slice(0, 8)}</Badge>;
            })}
          </div>
        ) : (
          <p className="empty-state__message">No sports selected yet.</p>
        )}
      </section>

      {(Object.keys(CATEGORY_META) as CategoryKey[]).map((category) => {
        const items = byCategory[category];
        return (
          <section key={category} className="card">
            <h2 className="card__title">{CATEGORY_META[category].title}</h2>
            <p className="card__hint">{CATEGORY_META[category].hint}</p>
            {items.length === 0 ? (
              <p className="empty-state__message">No {CATEGORY_META[category].title.toLowerCase()} available in master data.</p>
            ) : (
              <div className="check-grid">
                {items.map((item) => {
                  const on = Boolean(selected[item.id]);
                  return (
                    <label key={item.id} className={`check-card${on ? ' check-card--checked' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(item.id)} />
                      <span>{item.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
