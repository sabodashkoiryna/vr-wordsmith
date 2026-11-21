import { useState } from 'react';
import { fileLabel, openStoredFile, uploadToPrefix } from '../../../lib/storageFiles';

const MAX_MB = 50;

/**
 * Поле-список файлів.
 *
 * До цього ключі S3 вводилися рядками в текстову область — тобто файл треба
 * було якось покласти в сховище повз інтерфейс, а потім не помилитися,
 * переписуючи ключ руками. Тут файл обирається звичайним діалогом, а вже
 * завантажений відкривається одним натисканням.
 *
 * У базі лишаються саме КЛЮЧІ, а не адреси: підписане посилання живе годину
 * й у збереженому вигляді не має сенсу.
 */
export default function FilesField({
  value,
  onChange,
  prefix,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  prefix: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keys = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  function setKeys(next: string[]) {
    onChange(next.join('\n'));
  }

  async function upload(files: FileList) {
    setError(null);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`«${file.name}» більший за ${MAX_MB} МБ.`);
        continue;
      }
      try {
        setBusy(file.name);
        added.push(await uploadToPrefix(prefix, file));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Не вдалося завантажити «${file.name}»`);
      } finally {
        setBusy(null);
      }
    }
    if (added.length) setKeys([...keys, ...added]);
  }

  async function open(key: string) {
    const problem = await openStoredFile(key);
    if (problem) setError(problem);
  }

  return (
    <div className="flex flex-col gap-3">
      {keys.length > 0 && (
        <ul className="flex list-none flex-col gap-2 p-0">
          {keys.map((key) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-space-700 px-4 py-2.5"
            >
              <button
                type="button"
                onClick={() => void open(key)}
                title={key}
                className="flex-1 cursor-pointer truncate border-none bg-transparent p-0 text-left text-sm text-ink hover:text-violet-300"
              >
                {fileLabel(key)} ↗
              </button>
              <button
                type="button"
                onClick={() => setKeys(keys.filter((k) => k !== key))}
                className="shrink-0 cursor-pointer border-none bg-transparent font-mono text-2xs text-ink-mute hover:text-danger"
              >
                прибрати
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="cursor-pointer self-start rounded-[var(--radius-sm)] bg-space-700 px-4 py-2.5 font-mono text-2xs text-ink transition-colors hover:bg-space-600">
        <input
          type="file"
          multiple
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = '';
          }}
        />
        {busy ? `Завантажуємо «${busy}»…` : 'Додати файли'}
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && !error && <span className="text-sm text-ink-mute">{hint}</span>}
    </div>
  );
}
