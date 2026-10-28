import { useCallback, useEffect, useMemo, useState } from 'react';
import ImageField from './ImageField';
import {
  AdminButton,
  Banner,
  Drawer,
  EmptyState,
  PageHeader,
  SearchInput,
  Toolbar,
} from './adminUi';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'markdown'
  | 'number'
  | 'select'
  | 'boolean'
  | 'stringArray'
  | 'image'
  | 'json';

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  hint?: string;
  /** Показувати колонкою в таблиці. Якщо не вказано — перші чотири поля. */
  inTable?: boolean;
  required?: boolean;
  /** Ширина колонки в таблиці, напр. '90px' або 'minmax(0,2fr)'. */
  width?: string;
  /** Для type: 'image' — префікс у S3, напр. 'public/gallery/'. */
  prefix?: string;
};

export type Item = Record<string, unknown> & { id?: string };

type Props = {
  title: string;
  description?: string;
  fields: Field[];
  orderKey?: string;
  /** Підпис рядка в заголовку панелі — інакше там буде «Запис». */
  labelKey?: string;
  list: () => Promise<Item[]>;
  create: (values: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, values: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

/* --- перетворення значень --------------------------------------------- */

function toForm(f: Field, v: unknown): string {
  if (f.type === 'stringArray') return Array.isArray(v) ? v.join('\n') : '';
  if (f.type === 'boolean') return v === true ? 'true' : v === false ? 'false' : '';
  if (f.type === 'json') {
    if (v == null) return '';
    if (typeof v === 'string') {
      try {
        return JSON.stringify(JSON.parse(v), null, 2);
      } catch {
        return v;
      }
    }
    return JSON.stringify(v, null, 2);
  }
  return v == null ? '' : String(v);
}

function fromForm(f: Field, raw: string): unknown {
  if (f.type === 'number') return raw === '' ? null : Number(raw);
  if (f.type === 'boolean') return raw === '' ? null : raw === 'true';
  if (f.type === 'stringArray')
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  if (f.type === 'json') {
    if (!raw.trim()) return null;
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  // Порожній рядок — це «очистити поле», а не «пустий текст».
  return raw === '' ? null : raw;
}

function cell(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'так' : 'ні';
  if (v && typeof v === 'object') return JSON.stringify(v);
  const s = v == null ? '' : String(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

/**
 * Універсальний екран керування записами.
 *
 * Замінює CrudTable з PoC, який показував лише перші три поля, відкривав
 * форму ПІД таблицею й давав чотири рядки на текст уроку — редагувати
 * півторатисячослівну лекцію в такому полі неможливо.
 *
 * Тут: видно всі налаштовані колонки, є пошук і сортування, редагування в
 * бічній панелі, а markdown отримує на екран стільки місця, скільки є.
 */
export default function ResourceManager({
  title,
  description,
  fields,
  orderKey,
  labelKey,
  list,
  create,
  update,
  remove,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(orderKey ?? null);
  const [sortAsc, setSortAsc] = useState(true);

  const [editing, setEditing] = useState<Item | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const tableFields = useMemo(() => {
    const marked = fields.filter((f) => f.inTable);
    return marked.length ? marked : fields.slice(0, 4);
  }, [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = items;
    if (q) {
      rows = rows.filter((it) =>
        fields.some((f) => String(it[f.key] ?? '').toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const n = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), 'uk', { numeric: true });
        return sortAsc ? n : -n;
      });
    }
    return rows;
  }, [items, query, fields, sortKey, sortAsc]);

  const dirty = useMemo(
    () => fields.some((f) => (values[f.key] ?? '') !== (initial[f.key] ?? '')),
    [values, initial, fields],
  );

  function openRow(item: Item | null) {
    const v: Record<string, string> = {};
    fields.forEach((f) => {
      v[f.key] = item ? toForm(f, item[f.key]) : '';
    });
    setValues(v);
    setInitial(v);
    setEditing(item ?? {});
    setError(null);
    setNotice(null);
  }

  // Закриття з незбереженими змінами питає — інакше година роботи зникає від
  // випадкового Esc.
  const close = useCallback(() => {
    if (dirty && !window.confirm('Є незбережені зміни. Закрити без збереження?')) return;
    setEditing(null);
  }, [dirty]);

  async function save() {
    if (!editing) return;
    const missing = fields.filter((f) => f.required && !(values[f.key] ?? '').trim());
    if (missing.length) {
      setError(`Заповніть обов’язкові поля: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        payload[f.key] = fromForm(f, values[f.key] ?? '');
      });
      if (editing.id) await update(editing.id as string, payload);
      else await create(payload);
      setNotice(editing.id ? 'Збережено.' : 'Створено.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!editing?.id) return;
    const name = labelKey ? String(editing[labelKey] ?? '') : '';
    if (!window.confirm(`Видалити${name ? ` «${name}»` : ' запис'}? Дію не скасувати.`)) return;
    setSaving(true);
    try {
      await remove(editing.id as string);
      setEditing(null);
      setNotice('Видалено.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення');
    } finally {
      setSaving(false);
    }
  }

  const hasMarkdown = fields.some((f) => f.type === 'markdown');
  const drawerTitle = editing?.id
    ? labelKey
      ? String(editing[labelKey] ?? 'Редагування')
      : 'Редагування'
    : 'Новий запис';

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        count={loading ? undefined : `${visible.length}${query ? ` з ${items.length}` : ''}`}
        actions={
          <AdminButton variant="primary" onClick={() => openRow(null)}>
            + Додати
          </AdminButton>
        }
      />

      {error && !editing && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Пошук за будь-яким полем…" />
        {query && (
          <AdminButton onClick={() => setQuery('')}>Скинути</AdminButton>
        )}
      </Toolbar>

      {loading ? (
        <p className="text-ink-mute">Завантажуємо…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={query ? 'Нічого не знайдено' : 'Записів ще немає'}
          hint={query ? 'Спробуйте інший запит.' : 'Створіть перший через «Додати».'}
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-space-800">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {tableFields.map((f) => (
                  <th
                    key={f.key}
                    style={f.width ? { width: f.width } : undefined}
                    className="px-4 py-3 font-mono text-2xs font-normal tracking-widest text-ink-mute"
                  >
                    <button
                      onClick={() => {
                        if (sortKey === f.key) setSortAsc((s) => !s);
                        else {
                          setSortKey(f.key);
                          setSortAsc(true);
                        }
                      }}
                      className="cursor-pointer border-none bg-transparent p-0 font-mono text-2xs tracking-widest text-ink-mute hover:text-ink"
                    >
                      {f.label.toUpperCase()}
                      {sortKey === f.key && (sortAsc ? ' ↑' : ' ↓')}
                    </button>
                  </th>
                ))}
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={String(item.id)}
                  onClick={() => openRow(item)}
                  className="cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-space-700"
                >
                  {tableFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 align-top text-sm text-ink-soft">
                      {cell(item[f.key])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-2xs text-ink-mute">редагувати →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!editing}
        title={drawerTitle}
        onClose={close}
        wide={hasMarkdown}
        footer={
          <>
            <AdminButton variant="primary" onClick={save} disabled={saving || !dirty}>
              {saving ? 'Зберігаємо…' : 'Зберегти'}
            </AdminButton>
            <AdminButton onClick={close} disabled={saving}>
              Скасувати
            </AdminButton>
            {editing?.id && (
              <span className="ml-auto">
                <AdminButton variant="danger" onClick={destroy} disabled={saving}>
                  Видалити
                </AdminButton>
              </span>
            )}
          </>
        }
      >
        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex flex-col gap-5">
          {fields.map((f) => (
            <FieldControl
              key={f.key}
              field={f}
              value={values[f.key] ?? ''}
              onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
            />
          ))}
        </div>
      </Drawer>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    'w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-4 py-3 text-md text-ink placeholder:text-ink-dim focus:border-cyan-400 focus:outline-none';

  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline gap-2">
        <span className="font-mono text-2xs tracking-widest text-ink-mute">
          {field.label.toUpperCase()}
        </span>
        {field.required && <span className="font-mono text-2xs text-danger">обов’язкове</span>}
        {field.type === 'markdown' && (
          <span className="ml-auto font-mono text-2xs text-ink-mute">
            {value.trim() ? `${value.trim().split(/\s+/).length} слів` : 'порожньо'}
          </span>
        )}
      </span>

      {field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">—</option>
          <option value="true">так</option>
          <option value="false">ні</option>
        </select>
      ) : field.type === 'image' ? (
        <ImageField
          value={value}
          onChange={onChange}
          prefix={field.prefix ?? 'public/media/'}
          hint={field.hint}
        />
      ) : field.type === 'markdown' ? (
        /* Markdown отримує висоту екрана: лекція на півтори тисячі слів у
           полі на чотири рядки не редагується, а переписується наосліп. */
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          className={`${base} min-h-[58vh] resize-y font-mono text-sm leading-relaxed`}
        />
      ) : field.type === 'textarea' || field.type === 'stringArray' || field.type === 'json' ? (
        <textarea
          rows={field.type === 'json' ? 10 : 4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-y ${field.type === 'json' ? 'font-mono text-sm' : ''}`}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}

      {/* Поле-зображення малює підказку саме, причому ховає її, коли є
          помилка. Якби ми надрукували її ще й тут, вона двоїлася б. */}
      {field.hint && field.type !== 'image' && (
        <span className="text-sm text-ink-mute">{field.hint}</span>
      )}
    </label>
  );
}
