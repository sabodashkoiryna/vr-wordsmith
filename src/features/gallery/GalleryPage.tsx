import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import { Reveal } from '../../ui/motion/Reveal';
import { galleryItems, coverGradients, TOOLS, type GalleryItem } from './galleryData';

function Cover({ item }: { item: GalleryItem }) {
  return (
    <div
      className="relative aspect-[4/3] overflow-hidden"
      style={{ background: coverGradients[item.coverSeed % coverGradients.length] }}
      aria-hidden="true"
    >
      {/* Зоряний пил — той самий прийом, що й у геройському порталі,
          щоб картки читались як частина одного світу. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(1.4px 1.4px at 22% 24%, #fff 60%, transparent 61%),' +
            'radial-gradient(1px 1px at 68% 16%, #fff 60%, transparent 61%),' +
            'radial-gradient(1.6px 1.6px at 84% 62%, #fff 60%, transparent 61%),' +
            'radial-gradient(1px 1px at 36% 70%, #fff 60%, transparent 61%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 -60px 80px -40px rgb(5 4 14 / 0.9)' }}
      />
    </div>
  );
}

function Card({ item, index }: { item: GalleryItem; index: number }) {
  const inner = (
    <>
      <Cover item={item} />
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-space-600 px-2.5 py-1 font-mono text-2xs tracking-widest text-violet-300">
            {item.tool}
          </span>
          <span className="font-mono text-2xs tracking-widest text-ink-mute">{item.subject}</span>
        </div>
        <h3 className="font-display text-lg leading-snug text-ink">{item.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>
        <p className="mt-5 border-t border-[var(--line)] pt-4 font-mono text-2xs tracking-widest text-ink-mute">
          {item.isPlaceholder ? 'ОЧІКУЄ НА ПЕРШУ РОБОТУ' : item.authorDisplayName}
        </p>
      </div>
    </>
  );

  const shell =
    'glass flex flex-col overflow-hidden rounded-[var(--radius-lg)] transition-[border-color,transform] hover:border-[var(--line-glow)] hover:-translate-y-1';

  return (
    <Reveal delay={index % 3} className="h-full">
      {item.externalUrl ? (
        <a
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${shell} h-full no-underline`}
        >
          {inner}
        </a>
      ) : (
        <article className={`${shell} h-full`}>{inner}</article>
      )}
    </Reveal>
  );
}

export default function GalleryPage() {
  const [tool, setTool] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tool ? galleryItems.filter((i) => i.tool === tool) : galleryItems),
    [tool],
  );

  const hasRealWorks = galleryItems.some((i) => !i.isPlaceholder);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />

      <section className="container-content relative pt-16 pb-10 md:pt-24">
        <Reveal>
          <p className="eyebrow mb-4">Роботи учасників</p>
          <h1 className="max-w-3xl text-4xl">
            Галерея <span className="text-gradient">VR-матеріалів</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Тут публікуються VR-матеріали учасників курсу, що отримали позитивну оцінку — з дозволу
            авторів. Це водночас портфоліо автора й банк готових рішень для інших учителів.
          </p>
        </Reveal>

        {!hasRealWorks && (
          <Reveal delay={1}>
            <div className="glass-2 mt-8 flex flex-col gap-4 rounded-[var(--radius-lg)] p-6 md:flex-row md:items-center md:justify-between">
              <p className="text-md text-ink-soft">
                Курс щойно відкрився — перші роботи з’являться тут після перевірки.{' '}
                <span className="text-ink">Нижче — теми, над якими працюють учасники.</span>
              </p>
              <Button as={Link} to="/signup" className="shrink-0">
                Долучитися до курсу
              </Button>
            </div>
          </Reveal>
        )}
      </section>

      <section className="container-content relative pb-24">
        <Reveal>
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setTool(null)}
              className={`cursor-pointer rounded-full border px-4 py-2 font-mono text-2xs tracking-widest transition-colors ${
                tool === null
                  ? 'border-violet-500 bg-violet-500 text-white'
                  : 'border-[var(--line)] bg-space-700 text-ink-soft hover:bg-space-600'
              }`}
            >
              Усі
            </button>
            {TOOLS.map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`cursor-pointer rounded-full border px-4 py-2 font-mono text-2xs tracking-widest transition-colors ${
                  tool === t
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-[var(--line)] bg-space-700 text-ink-soft hover:bg-space-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-md text-ink-mute">
            За цим інструментом робіт поки немає.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => (
              <Card key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
