import { useCallback, useEffect, useState } from 'react';
import { AdminButton } from './adminUi';

const storage = () => import('aws-amplify/storage');

const MAX_MB = 10;

/**
 * Поле-вивантажувач зображення.
 *
 * У базі зберігається КЛЮЧ файлу в S3, а не URL: посилання на приватний
 * бакет підписані й живуть годину, тож збережений URL протух би ще до того,
 * як хтось відкриє сторінку. Адреса для показу запитується щоразу заново.
 *
 * Префікс задає поле, а не компонент: обкладинки галереї мусять лежати в
 * `public/gallery/`, фото викладача — в `public/media/`. Обидва відкриті
 * гостям на читання, на відміну від `submissions/`, куди складаються роботи
 * студентів і куди гостю не можна.
 */
export default function ImageField({
  value,
  onChange,
  prefix,
  hint,
}: {
  value: string;
  onChange: (key: string) => void;
  prefix: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!value) {
      setPreview(null);
      return;
    }
    try {
      const { getUrl } = await storage();
      const { url } = await getUrl({ path: value });
      setPreview(url.toString());
    } catch {
      // Ключ є, а файлу немає — показуємо це, а не порожнє місце: інакше
      // зламану обкладинку помітять аж на публічній сторінці.
      setPreview(null);
      setError('Файл за цим ключем не знайдено.');
    }
  }, [value]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function upload(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Файл більший за ${MAX_MB} МБ.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Потрібне зображення.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { uploadData } = await storage();
      // Мітка часу спереду: інакше друге завантаження однойменного файлу
      // мовчки затерло б обкладинку іншого запису.
      const name = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const result = await uploadData({ path: `${prefix}${name}`, data: file }).result;
      onChange(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {preview && (
        <img
          src={preview}
          alt=""
          className="max-h-48 w-full rounded-[var(--radius-sm)] object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-[var(--radius-sm)] bg-space-700 px-4 py-2.5 font-mono text-2xs text-ink transition-colors hover:bg-space-600">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
          {busy ? 'Завантажуємо…' : value ? 'Замінити' : 'Обрати файл'}
        </label>

        {value && (
          <AdminButton variant="danger" onClick={() => onChange('')} disabled={busy}>
            Прибрати
          </AdminButton>
        )}
      </div>

      {value && (
        <code className="block truncate font-mono text-2xs text-ink-mute" title={value}>
          {value}
        </code>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && !error && <span className="text-sm text-ink-mute">{hint}</span>}
    </div>
  );
}
