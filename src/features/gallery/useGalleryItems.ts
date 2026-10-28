import { useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { usePublicAuthMode } from '../../lib/publicAuthMode';
import { galleryItems as placeholders, type GalleryItem } from './galleryData';

export type GalleryFile = { name: string; url: string; isImage: boolean };

export type LiveGalleryItem = GalleryItem & {
  coverUrl?: string;
  files: GalleryFile[];
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

const storage = () => import('aws-amplify/storage');

/**
 * Галерея з бекенда, із заглушками як запасним варіантом.
 *
 * Читається і гостем, і залогіненим — звідси usePublicAuthMode: гість іде
 * через identityPool, решта через userPool. Пропустити це не можна, збій
 * асиметричний: перевіряючи лише залогіненим, його не побачиш.
 *
 * Файли живуть у public/gallery/* — це КОПІЇ, зроблені під час публікації.
 * Оригінали лежать у submissions/{entity_id}/*, куди гість доступу не має й
 * мати не може: той префікс містить роботи всіх студентів, а дозвіл S3 діє
 * на префікс, а не на окремий об'єкт.
 *
 * Посилання підписані й живуть недовго, тому їх беремо на кожне відкриття
 * сторінки, а не зберігаємо в моделі — збережений URL протух би мовчки.
 */
export function useGalleryItems() {
  const authOpts = usePublicAuthMode();
  const [items, setItems] = useState<LiveGalleryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authOpts === null) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await unwrap(client.models.GalleryItem.list({ limit: 500, ...authOpts }));
        if (cancelled) return;

        const published = rows
          .filter((r) => r.publishState === 'published')
          .sort((a, b) => a.order - b.order);

        if (published.length === 0) {
          setItems([]);
          return;
        }

        const { getUrl } = await storage();
        const mapped = await Promise.all(
          published.map(async (r, i) => {
            const keys = (r.fileKeys ?? []).filter((k): k is string => !!k);
            const files = await Promise.all(
              keys.map(async (k) => {
                const { url } = await getUrl({ path: k });
                return {
                  name: (k.split('/').pop() ?? k).replace(/^\d+-/, ''),
                  url: url.toString(),
                  isImage: IMAGE_RE.test(k),
                };
              }),
            );
            const coverKey = r.coverImageKey ?? keys.find((k) => IMAGE_RE.test(k)) ?? null;
            const cover = coverKey ? await getUrl({ path: coverKey }) : null;
            return {
              id: r.id,
              title: r.title,
              // Ім'я показуємо, лише якщо автор дав згоду саме на ім'я:
              // публікація роботи і публікація авторства — різні рішення.
              authorDisplayName:
                r.consentGiven && r.authorDisplayName ? r.authorDisplayName : 'Автор анонімно',
              moduleCode: r.moduleCode ?? '',
              subject: r.subject ?? '',
              tool: r.tool ?? '',
              description: r.description ?? '',
              coverSeed: i,
              coverUrl: cover?.url.toString(),
              files,
            } satisfies LiveGalleryItem;
          }),
        );
        if (!cancelled) setItems(mapped);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не вдалося завантажити галерею');
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authOpts]);

  const live = items ?? [];
  const hasRealWorks = live.length > 0;

  return {
    loading: items === null,
    error,
    hasRealWorks,
    // Поки реальних робіт немає — показуємо теми, над якими працюють учасники.
    // Порожня сітка виглядала б як поламана сторінка, а не як новий курс.
    items: hasRealWorks
      ? live
      : placeholders.map((p) => ({ ...p, files: [] as GalleryFile[] })),
  };
}
