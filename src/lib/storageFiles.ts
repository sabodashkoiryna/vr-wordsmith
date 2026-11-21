const storage = () => import('aws-amplify/storage');

/** Ім'я для людини: без префікса-теки й без мітки часу, яку додав завантажувач. */
export function fileLabel(key: string): string {
  return (key.split('/').pop() ?? key).replace(/^\d{10,}-/, '');
}

/**
 * Завантажує файл у вказаний префікс і повертає КЛЮЧ, під яким він ліг.
 *
 * Мітка часу спереду розводить однойменні файли з різних записів: без неї
 * друге завантаження «cover.png» мовчки затерло б чуже.
 */
export async function uploadToPrefix(prefix: string, file: File): Promise<string> {
  const name = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { uploadData } = await storage();
  const result = await uploadData({ path: `${prefix}${name}`, data: file }).result;
  return result.path;
}

/** Адреса для показу. Підписана й живе близько години, тож не зберігається. */
export async function storedFileUrl(key: string): Promise<string> {
  const { getUrl } = await storage();
  const { url } = await getUrl({ path: key });
  return url.toString();
}

/**
 * Відкриває файл S3 у новій вкладці.
 *
 * Посилання беремо щоразу заново: збережений URL протух би мовчки — кнопка
 * лишалася б на місці, а за нею був би AccessDenied.
 *
 * `window.open` викликаємо ДО await: Safari блокує вікно, відкрите після
 * асинхронної паузи, бо вже не бачить у ньому дії користувача.
 *
 * І саме тому БЕЗ 'noopener': з ним `window.open` за специфікацією повертає
 * null, дескриптора немає, і вкладку вже нічим не наповнити. Запасний шлях
 * через `window.location` тоді забирав би людину зі сторінки, яку вона
 * редагує, — замість того щоб відкрити файл поруч. Посилання на нас
 * обриваємо вручну, одразу після відкриття.
 *
 * Повертає текст помилки або null, якщо все гаразд.
 */
export async function openStoredFile(key: string): Promise<string | null> {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const url = await storedFileUrl(key);
    if (tab) tab.location.href = url;
    return tab ? null : 'Браузер заблокував нову вкладку — дозвольте спливні вікна для цього сайта.';
  } catch (err) {
    tab?.close();
    return err instanceof Error ? err.message : 'Не вдалося відкрити файл';
  }
}
