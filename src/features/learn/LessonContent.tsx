import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Текст лекції.
 *
 * Рендеримо через react-markdown, а не власним мінімальним парсером: уроки
 * редагуються з адмінки, тож набір синтаксису визначає врешті автор курсу, а
 * не ми. Своя реалізація підтримувала б рівно те, що ми вгадали наперед, і
 * тихо ламалася б на першій таблиці чи зносці. Компонент потрапляє в lazy-чанк
 * кабінету — лендінг від цього не важчає.
 *
 * `remarkGfm` тут не для повноти, а тому що в лекціях уже є таблиці.
 */
export default function LessonContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Зовнішні посилання відкриваємо в новій вкладці: у лекціях це
          // здебільшого інструменти й приклади, і втрачати місце в тексті,
          // щоб піти їх подивитись, — найшвидший спосіб не повернутись.
          a: ({ href, children }) => {
            const external = !!href && /^https?:/.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
