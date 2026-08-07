import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import { Reveal } from '../../ui/motion/Reveal';
import HeroPortal from './HeroPortal';
import {
  hero,
  stats,
  valueProps,
  modules,
  lecturer,
  certificate,
  faq,
  finalCta,
} from '../../content/landing';

/* ========================================================================== */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-20 md:pt-16 md:pb-28">
      {/* Розсіяне світіння вгорі сторінки — задає глибину ще до порталу. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />
      <div className="container-content relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal direction="up">
            <p className="eyebrow mb-5">{hero.eyebrow}</p>
          </Reveal>
          <Reveal direction="up" delay={1}>
            <h1 className="text-4xl md:text-[clamp(2.5rem,4.5vw,3.9rem)]">
              Українська словесність зустрічає{' '}
              <span className="text-gradient">віртуальну реальність</span>
            </h1>
          </Reveal>
          <Reveal direction="up" delay={2}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{hero.lead}</p>
          </Reveal>
          <Reveal direction="up" delay={3}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button as={Link} to="/signup" size="lg">
                {hero.primaryCta}
              </Button>
              <Button as="a" href="#curriculum" variant="ghost" size="lg">
                {hero.secondaryCta}
              </Button>
            </div>
          </Reveal>
          <Reveal direction="up" delay={4}>
            <p className="mt-6 font-mono text-2xs tracking-widest text-ink-mute">
              Реєстрація за хвилину · без оплат · сертифікат після завершення
            </p>
          </Reveal>
        </div>

        <Reveal direction="none" delay={2}>
          <HeroPortal quote={hero.quote} source={hero.quoteSource} />
          <p className="mt-4 text-center font-mono text-2xs tracking-widest text-ink-mute">
            {hero.hint}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ========================================================================== */

function Stats() {
  return (
    <section className="container-content">
      <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-xl)] md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal
            key={s.label}
            delay={i}
            className="bg-space-800/40 px-6 py-8 text-center md:px-4"
          >
            <div className="font-display text-3xl leading-none text-ink">
              {s.value}
              <span className="ml-1.5 font-mono text-xs tracking-widest text-violet-300">
                {s.unit}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-mute">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="container-content py-[var(--space-section)]">
      <Reveal>
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h2 className="max-w-3xl text-3xl">{title}</h2>
        {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{lead}</p>}
      </Reveal>
      <div className="mt-12">{children}</div>
    </section>
  );
}

/* ========================================================================== */

function ValueGrid() {
  return (
    <Section
      id="course"
      eyebrow="Про курс"
      title="VR на уроці словесності — не атракціон, а інструмент"
      lead="Курс відповідає на питання, яке справді має значення: коли занурення дає учневі досвід, якого не дасть жоден підручник — і коли не дає нічого, крім захвату на п'ять хвилин."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {valueProps.map((v, i) => (
          <Reveal
            key={v.title}
            delay={i}
            className="glass rounded-[var(--radius-lg)] p-7 transition-colors hover:border-[var(--line-glow)]"
          >
            <h3 className="text-lg text-ink">{v.title}</h3>
            <p className="mt-3 text-md leading-relaxed text-ink-soft">{v.text}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ========================================================================== */

function Curriculum() {
  const [open, setOpen] = useState(0);

  return (
    <Section
      id="curriculum"
      eyebrow="Програма · 15 тижнів"
      title="П'ять модулів: від «навіщо» до власного уроку"
      lead="Кожен модуль містить лекції, тест з автоматичною перевіркою та практичне завдання, яке перевіряє викладач."
    >
      <div className="flex flex-col gap-3">
        {modules.map((m, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={m.code} delay={i}>
              <div
                className={`glass overflow-hidden rounded-[var(--radius-lg)] transition-colors ${
                  isOpen ? 'border-[var(--line-glow)]' : ''
                }`}
              >
                <button
                  className="flex w-full cursor-pointer items-center gap-5 p-6 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="font-mono text-2xs tracking-widest whitespace-nowrap text-violet-300">
                    {m.code}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg text-ink">{m.title}</span>
                    <span className="mt-1 block text-sm text-ink-mute">
                      {m.weeks} · {m.summary}
                    </span>
                  </span>
                  <span
                    className={`text-xl text-ink-mute transition-transform duration-[var(--dur-base)] ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
                {/* grid 0fr→1fr анімує до справжньої висоти, на відміну від
                    max-height-хака, який був у PoC. */}
                <div
                  className="grid transition-[grid-template-rows] duration-[var(--dur-base)] ease-[var(--ease-out)]"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <ul className="flex flex-col gap-2 px-6 pb-6 pl-6 md:pl-[8.5rem]">
                      {m.topics.map((t) => (
                        <li key={t} className="flex gap-3 text-md text-ink-soft">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ========================================================================== */

function Lecturer() {
  return (
    <Section id="lecturer" eyebrow="Викладач" title="Хто веде курс">
      <Reveal>
        <div className="glass flex flex-col gap-8 rounded-[var(--radius-xl)] p-8 md:flex-row md:items-center md:p-10">
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full font-display text-3xl text-white"
            style={{ background: 'var(--grad-aurora)' }}
            aria-hidden="true"
          >
            {lecturer.photoInitials}
          </div>
          <div>
            <h3 className="font-display text-2xl text-ink">{lecturer.fullName}</h3>
            <p className="mt-1 text-md text-violet-300">{lecturer.position}</p>
            <p className="font-mono text-2xs tracking-widest text-ink-mute">
              {lecturer.affiliation}
            </p>
            <p className="mt-4 max-w-2xl text-md leading-relaxed text-ink-soft">{lecturer.bio}</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ========================================================================== */

function CertificateBand() {
  return (
    <section id="certificate" className="relative overflow-hidden py-[var(--space-section)]">
      <div
        aria-hidden="true"
        className="anim-aurora pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'var(--grad-nebula)', filter: 'blur(90px)' }}
      />
      <div className="container-content relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-4">Результат</p>
            <h2 className="text-3xl">{certificate.title}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">{certificate.text}</p>
          </Reveal>

          <Reveal direction="left">
            <div className="flex flex-col gap-3">
              {certificate.points.map((p, i) => (
                <div
                  key={p.label}
                  className="glass-2 flex items-baseline gap-4 rounded-[var(--radius-md)] px-6 py-5"
                >
                  <span
                    className="font-display text-2xl"
                    style={
                      i === 2
                        ? { color: 'var(--color-gold)' }
                        : { color: 'var(--color-violet-300)' }
                    }
                  >
                    {p.value}
                  </span>
                  <span className="flex-1">
                    <span className="block text-md text-ink">{p.label}</span>
                    <span className="block text-sm text-ink-mute">{p.hint}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */

function GalleryTeaser() {
  return (
    <Section
      eyebrow="Роботи учасників"
      title="Що створюють ті, хто пройшов курс"
      lead="Найкращі VR-матеріали учасників — з їхнього дозволу — потрапляють у публічну галерею. Це і портфоліо автора, і банк готових рішень для інших учителів."
    >
      <Reveal>
        <div className="flex flex-wrap items-center gap-4">
          <Button as={Link} to="/gallery" size="lg" variant="ghost">
            Переглянути галерею робіт →
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}

/* ========================================================================== */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" eyebrow="Запитання" title="Коротко про головне">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {faq.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.q} delay={i}>
              <div className="glass overflow-hidden rounded-[var(--radius-md)]">
                <button
                  className="flex w-full cursor-pointer items-center gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="flex-1 font-display text-md text-ink">{item.q}</span>
                  <span
                    className={`text-lg text-ink-mute transition-transform duration-[var(--dur-base)] ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-[var(--dur-base)] ease-[var(--ease-out)]"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-md leading-relaxed text-ink-soft">{item.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ========================================================================== */

function FinalCta() {
  return (
    <section className="container-content pb-[var(--space-section)]">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-[var(--radius-2xl)] px-8 py-16 text-center md:px-16 md:py-20"
          style={{ background: 'var(--grad-aurora)' }}
        >
          <h2 className="text-3xl text-white">{finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{finalCta.text}</p>
          <div className="mt-9 flex justify-center">
            <Button
              as={Link}
              to="/signup"
              size="lg"
              className="border-2 border-white bg-white! text-[#1C1633]! hover:brightness-95"
            >
              {finalCta.cta}
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ========================================================================== */

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <ValueGrid />
      <Curriculum />
      <Lecturer />
      <CertificateBand />
      <GalleryTeaser />
      <Faq />
      <FinalCta />
    </>
  );
}
