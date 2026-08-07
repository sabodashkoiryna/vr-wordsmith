/**
 * Тимчасові дані галереї.
 *
 * Реальні записи житимуть у моделі GalleryItem (адмін публікує туди роботи,
 * що отримали позитивну оцінку). Доки моделі немає, сторінка будується на
 * цьому масиві з тією самою формою — тож перехід на бекенд зведеться до
 * заміни джерела в useGalleryItems, без переписування UI.
 */

export type GalleryItem = {
  id: string;
  title: string;
  authorDisplayName: string;
  moduleCode: string;
  /** Твір або тема шкільної програми */
  subject: string;
  tool: string;
  description: string;
  externalUrl?: string;
  /** Поки немає обкладинок — рендеримо згенерований градієнт за цим індексом. */
  coverSeed: number;
  isPlaceholder?: boolean;
};

export const TOOLS = ['CoSpaces Edu', 'ThingLink', '360°-відео', 'AR'] as const;

export const galleryItems: GalleryItem[] = [
  {
    id: 'shadows-carpathians',
    title: '«Тіні забутих предків»: VR-мандрівка Карпатами',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Література · 7–10 клас',
    tool: 'CoSpaces Edu',
    description:
      'Віртуальний простір Івана та Марічки: полонини, звичаї, магія гір як контекст новели М. Коцюбинського.',
    coverSeed: 0,
    isPlaceholder: true,
  },
  {
    id: 'slovo-ihor',
    title: '«Слово о полку Ігоревім»: імерсивна реконструкція',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Література · 8 клас',
    tool: '360°-відео',
    description:
      'Похід Ігоря у 360°: маршрут, «золоте слово» Святослава, плач Ярославни у віртуальному Путивлі.',
    coverSeed: 1,
    isPlaceholder: true,
  },
  {
    id: 'shevchenko-petersburg',
    title: '«Петербург Шевченка» до вивчення «Сну»',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Література · 9 клас',
    tool: 'ThingLink',
    description:
      'Віртуальна екскурсія містом поеми: контраст імперської столиці й підневільної України.',
    coverSeed: 2,
    isPlaceholder: true,
  },
  {
    id: 'kaydash-yard',
    title: '«Кайдашева сім’я»: подвір’я як простір конфлікту',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Література · 10 клас',
    tool: 'ThingLink',
    description:
      '360°-панорама садиби Кайдашів з інтерактивними точками — репліками персонажів у місцях сварок.',
    coverSeed: 3,
    isPlaceholder: true,
  },
  {
    id: 'dialects-quest',
    title: 'Мовний VR-квест «Подорож діалектами України»',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Мова · діалектна лексика',
    tool: 'CoSpaces Edu',
    description:
      'Маршрут наріччями: завдання на впізнавання діалектизмів у локаціях від Закарпаття до Слобожанщини.',
    coverSeed: 4,
    isPlaceholder: true,
  },
  {
    id: 'ar-parts-of-speech',
    title: 'AR-плакат «Частини мови оживають»',
    authorDisplayName: 'Роботу буде опубліковано',
    moduleCode: 'Модуль 4',
    subject: 'Мова · 6 клас',
    tool: 'AR',
    description:
      'Доповнена реальність над звичайним плакатом: наведення камери запускає міні-пояснення й завдання.',
    coverSeed: 5,
    isPlaceholder: true,
  },
];

/** Градієнти обкладинок, доки автори не завантажили власні. */
export const coverGradients = [
  'linear-gradient(145deg, #241A5E 0%, #4A2ED0 45%, #7A5CFF 100%)',
  'linear-gradient(145deg, #3B22B8 0%, #7A5CFF 50%, #35E1F0 100%)',
  'linear-gradient(145deg, #16112F 0%, #3B22B8 55%, #FF5CA8 100%)',
  'linear-gradient(145deg, #1E1840 0%, #5B3DF5 50%, #F0A46B 100%)',
  'linear-gradient(145deg, #0F0C22 0%, #2FD4B6 100%)',
  'linear-gradient(145deg, #2A2154 0%, #8B6BFF 45%, #FFE0B8 100%)',
];
