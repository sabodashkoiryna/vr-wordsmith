import { useEffect, useState } from 'react';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';

type ModuleItem = {
  id: string;
  order: number;
  code: string;
  component: string;
  title: string;
  weeks: string;
  topics?: (string | null)[] | null;
  tasks?: unknown;
  controlNote?: string | null;
};

function parseTasks(tasks: unknown): { code: string; text: string }[] {
  // a.json() зберігає значення як рядок із JSON
  if (typeof tasks === 'string') {
    try {
      const parsed = JSON.parse(tasks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(tasks) ? (tasks as { code: string; text: string }[]) : [];
}

const CHIP_CLASS: Record<string, string> = { М: 'm', К: 'k', Д: 'd', Р: 'r' };
const COMPONENT_LABEL: Record<string, string> = {
  М: 'мотиваційний',
  К: 'когнітивний',
  Д: 'діяльнісний',
  Р: 'рефлексійний',
};

function ModuleAccordionItem({ m, open, onToggle }: { m: ModuleItem; open: boolean; onToggle: () => void }) {
  const tasks = parseTasks(m.tasks);
  const topics = (m.topics ?? []).filter(Boolean) as string[];

  return (
    <div className={`module${open ? ' open' : ''}`} data-c={m.component}>
      <button className="acc-head" aria-expanded={open} onClick={onToggle}>
        <span className="mnum">{m.code}</span>
        <span className="mtitle">
          <b>{m.title}</b>
          <small>{m.weeks}</small>
        </span>
        <span className="chev">›</span>
      </button>
      <div className="acc-body">
        <h4>Теми</h4>
        <ul>
          {topics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h4>Завдання</h4>
        {tasks.map((t) => (
          <div className="task" key={t.code}>
            <code>{t.code}</code>
            {t.text}
          </div>
        ))}
        <h4>Контроль</h4>
        <p style={{ fontSize: 15 }}>{m.controlNote}</p>
      </div>
    </div>
  );
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await unwrap(client.models.Module.list({ authMode: 'identityPool' }));
        setModules([...data].sort((a, b) => a.order - b.order) as ModuleItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити модулі.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="page">
      <div className="eyebrow">Навчальний курс · 15 тижнів</div>
      <h2>П'ять модулів — чотири компоненти готовності</h2>
      <p className="instr-note">
        Кожен модуль реалізує одну педагогічну умову та формує відповідний компонент готовності:{' '}
        {(['М', 'К', 'Д', 'Р'] as const).map((c) => (
          <span className={`chip ${CHIP_CLASS[c]}`} key={c}>
            {c} — {COMPONENT_LABEL[c]}
          </span>
        ))}
      </p>
      {loading && <p className="instr-note">Завантаження…</p>}
      {error && <p className="error">{error}</p>}
      <div>
        {modules.map((m, i) => (
          <ModuleAccordionItem
            key={m.id}
            m={m}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  );
}
