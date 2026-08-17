import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Field } from '../components/ui/Field.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../components/ui/Toast.js';
import { listCategories, listItems, createItem, updateItem, setItemStatus } from '../services/masterData.service.js';
import { validateMasterItem } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { formatDateTime, statusLabel } from '../lib/format.js';
import type { MasterCategoryRow, MasterItemDto } from '../types/domain.js';
import { MASTER_CATEGORY_CODE } from '@turvo/shared';

const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<string, string> = {
  SPORTS: 'Sports',
  FACILITIES: 'Facilities',
  RULES: 'Rules',
  EQUIPMENT: 'Equipment',
};

interface ItemForm {
  name: string;
  description: string;
  sortOrder: number;
}

const EMPTY_FORM: ItemForm = { name: '', description: '', sortOrder: 0 };

export function MasterDataPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<MasterCategoryRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(MASTER_CATEGORY_CODE.SPORTS);

  const [rows, setRows] = useState<MasterItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<MasterItemDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {
        // Categories feed the tab bar; items still load below.
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listItems({
        page,
        limit: PAGE_SIZE,
        category: activeCategory as keyof typeof MASTER_CATEGORY_CODE,
        search: search || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(Math.ceil(result.total / PAGE_SIZE) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load master data.');
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.code === activeCategory)?.name ?? CATEGORY_LABELS[activeCategory] ?? activeCategory,
    [categories, activeCategory],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: MasterItemDto) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      sortOrder: item.sortOrder,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const save = async () => {
    const errors = validateMasterItem({
      name: form.name,
      description: form.description || undefined,
      sortOrder: form.sortOrder,
    });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      if (editing) {
        await updateItem(editing.id, {
          name: form.name,
          description: form.description || undefined,
          sortOrder: form.sortOrder,
        });
        toast.success('Item updated.');
      } else {
        await createItem({
          category: activeCategory as keyof typeof MASTER_CATEGORY_CODE,
          name: form.name,
          description: form.description || undefined,
          sortOrder: form.sortOrder,
        });
        toast.success('Item created.');
      }
      closeForm();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save item.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: MasterItemDto) => {
    const next = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await setItemStatus(item.id, next);
      toast.success(`${item.name} ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const columns: Column<MasterItemDto>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (i) => (
        <div>
          <strong>{i.name}</strong>
          {i.description && <div className="cell-sub">{i.description}</div>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (i) => CATEGORY_LABELS[i.categoryCode] ?? i.categoryCode },
    { key: 'sortOrder', header: 'Sort order', render: (i) => String(i.sortOrder) },
    { key: 'status', header: 'Status', render: (i) => <Badge tone={statusTone(i.status)}>{statusLabel(i.status)}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (i) => (
        <div className="row-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(i)}>Edit</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleStatus(i)}>
            {i.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
    { key: 'updated', header: 'Updated', render: (i) => formatDateTime(i.updatedAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Master Data"
        subtitle="Manage sports, facilities, rules and equipment catalogues."
        actions={
          <Button onClick={openCreate}>Add item</Button>
        }
      />

      <div className="tabs" role="tablist" aria-label="Master data categories">
        {(Object.keys(MASTER_CATEGORY_CODE) as Array<keyof typeof MASTER_CATEGORY_CODE>).map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={activeCategory === code}
            className={`tabs__tab${activeCategory === code ? ' tabs__tab--active' : ''}`}
            onClick={() => {
              setActiveCategory(code);
              setPage(1);
            }}
          >
            {CATEGORY_LABELS[code] ?? code}
          </button>
        ))}
      </div>

      <div className="filters">
        <Input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !rows.length ? (
        <Spinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(i) => i.id}
            emptyTitle={`No ${selectedCategoryName.toLowerCase()} found`}
            emptyMessage="Add a new item to get started."
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={formOpen}
        title={editing ? `Edit ${editing.name}` : `Add ${selectedCategoryName.toLowerCase()} item`}
        onClose={closeForm}
        footer={
          <>
            <Button variant="ghost" onClick={closeForm} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save changes' : 'Create item'}</Button>
          </>
        }
      >
        <div className="modal__fields">
          <Field label="Name" error={formErrors.name} required>
            <Input
              value={form.name}
              invalid={Boolean(formErrors.name)}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Description" error={formErrors.description}>
            <Textarea
              rows={3}
              value={form.description}
              invalid={Boolean(formErrors.description)}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Sort order" error={formErrors.sortOrder} hint="Lower numbers appear first.">
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              invalid={Boolean(formErrors.sortOrder)}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
