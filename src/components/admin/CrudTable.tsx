import { useEffect, useState } from 'react';

export type CrudField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'stringArray' | 'json';
  options?: string[];
};

type CrudItem = Record<string, unknown> & { id?: string };

type CrudTableProps = {
  title: string;
  fields: CrudField[];
  orderKey?: string;
  list: () => Promise<CrudItem[]>;
  create: (values: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, values: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

function formatCell(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v == null ? '' : String(v);
}

function toFormValue(field: CrudField, v: unknown): string {
  if (field.type === 'stringArray') return Array.isArray(v) ? v.join('\n') : '';
  if (field.type === 'json') return v == null ? '' : JSON.stringify(v, null, 2);
  return v == null ? '' : String(v);
}

function fromFormValue(field: CrudField, raw: string): unknown {
  if (field.type === 'number') return raw === '' ? undefined : Number(raw);
  if (field.type === 'stringArray')
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  if (field.type === 'json') {
    if (!raw.trim()) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export default function CrudTable({ title, fields, orderKey, list, create, update, remove }: CrudTableProps) {
  const [items, setItems] = useState<CrudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CrudItem | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await list();
      setItems(
        orderKey
          ? [...data].sort((a, b) => Number(a[orderKey] ?? 0) - Number(b[orderKey] ?? 0))
          : data,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setEditing({});
    setFormValues({});
  }

  function startEdit(item: CrudItem) {
    setEditing(item);
    const vals: Record<string, string> = {};
    fields.forEach((f) => {
      vals[f.key] = toFormValue(f, item[f.key]);
    });
    setFormValues(vals);
  }

  function cancelEdit() {
    setEditing(null);
    setFormValues({});
  }

  async function handleSave() {
    const values: Record<string, unknown> = {};
    fields.forEach((f) => {
      values[f.key] = fromFormValue(f, formValues[f.key] ?? '');
    });
    setError(null);
    try {
      if (editing?.id) {
        await update(editing.id, values);
      } else {
        await create(values);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Видалити запис?')) return;
    setError(null);
    try {
      await remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення');
    }
  }

  const previewFields = fields.slice(0, 3);

  return (
    <div className="admin-crud">
      <div className="admin-crud-head">
        <h3>{title}</h3>
        <button className="btn primary" onClick={startCreate}>
          + Додати
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="instr-note">Завантаження…</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {previewFields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id as string}>
                  {previewFields.map((f) => (
                    <td key={f.key}>{formatCell(item[f.key])}</td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost" onClick={() => startEdit(item)}>
                      Редагувати
                    </button>{' '}
                    <button className="btn ghost" onClick={() => handleDelete(item.id as string)}>
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={previewFields.length + 1}>Немає записів.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="admin-crud-form">
          <h4>{editing.id ? 'Редагування запису' : 'Новий запис'}</h4>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === 'textarea' || f.type === 'stringArray' || f.type === 'json' ? (
                <textarea
                  rows={f.type === 'json' ? 6 : 4}
                  value={formValues[f.key] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ) : f.type === 'select' ? (
                <select
                  value={formValues[f.key] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={formValues[f.key] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" onClick={handleSave}>
              Зберегти
            </button>
            <button className="btn ghost" onClick={cancelEdit}>
              Скасувати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
