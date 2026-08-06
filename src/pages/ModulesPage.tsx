import { useState } from 'react';
import { modules } from '../data/content';

const CHIP_CLASS: Record<string, string> = { М: 'm', К: 'k', Д: 'd', Р: 'r' };

function ModuleAccordionItem({
  m,
  open,
  onToggle,
}: {
  m: (typeof modules)[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`module${open ? ' open' : ''}`} data-c={m.c}>
      <button className="acc-head" aria-expanded={open} onClick={onToggle}>
        <span className="mnum">{m.n}</span>
        <span className="mtitle">
          <b>{m.title}</b>
          <small>{m.weeks}</small>
        </span>
        <span className="chev">›</span>
      </button>
      <div className="acc-body">
        <h4>Теми</h4>
        <ul>
          {m.topics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h4>Завдання</h4>
        {m.tasks.map((t) => (
          <div className="task" key={t.code}>
            <code>{t.code}</code>
            {t.text}
          </div>
        ))}
        <h4>Контроль</h4>
        <p style={{ fontSize: 15 }}>{m.ctrl}</p>
      </div>
    </div>
  );
}

export default function ModulesPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="page">
      <div className="eyebrow">Навчальний курс · 15 тижнів</div>
      <h2>П'ять модулів — чотири компоненти готовності</h2>
      <p className="instr-note">
        Кожен модуль реалізує одну педагогічну умову та формує відповідний компонент готовності:{' '}
        {(['М', 'К', 'Д', 'Р'] as const).map((c) => (
          <span className={`chip ${CHIP_CLASS[c]}`} key={c}>
            {c} — {{ М: 'мотиваційний', К: 'когнітивний', Д: 'діяльнісний', Р: 'рефлексійний' }[c]}
          </span>
        ))}
      </p>
      <div>
        {modules.map((m, i) => (
          <ModuleAccordionItem
            key={m.n}
            m={m}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  );
}
