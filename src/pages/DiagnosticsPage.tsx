import { useState } from 'react';
import { a1Items, s1Items, t1Questions, e1Blocks } from '../data/content';
import LikertInstrument from '../components/diagnostics/LikertInstrument';
import TestInstrument from '../components/diagnostics/TestInstrument';
import RubricInstrument from '../components/diagnostics/RubricInstrument';

const TABS = [
  { id: 'a1', label: 'Анкета А-1 · мотивація' },
  { id: 't1', label: 'Тест Т-1 · знання' },
  { id: 'e1', label: 'Картка Е-1 · проєкт' },
  { id: 's1', label: 'Шкала С-1 · рефлексія' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function DiagnosticsPage() {
  const [active, setActive] = useState<TabId>('a1');

  return (
    <section className="page">
      <div className="eyebrow">Діагностичний інструментарій</div>
      <h2>Виміряйте свою готовність</h2>
      <p className="instr-note">
        Інтерактивні версії інструментів констатувального та контрольного зрізів.
      </p>
      <div className="diag-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {active === 'a1' && (
        <div className="instrument visible">
          <h3>Анкета А-1 «Мотиваційно-ціннісне ставлення до застосування VR»</h3>
          <p className="instr-note">Оцініть кожне твердження: 1 — цілком не згоден/на … 5 — цілком згоден/на.</p>
          <LikertInstrument id="a1" items={a1Items} bounds={[44, 63]} criterionLabel="Мотиваційний критерій" />
        </div>
      )}

      {active === 't1' && (
        <div className="instrument visible">
          <h3>Тест Т-1 «Знання основ застосування VR у навчанні української мови та літератури»</h3>
          <p className="instr-note">
            Демоверсія: 12 завдань із 24 (по 3 на кожен змістовий блок). Оберіть одну відповідь у кожному завданні.
          </p>
          <TestInstrument questions={t1Questions} />
        </div>
      )}

      {active === 'e1' && (
        <div className="instrument visible">
          <h3>Експертна картка Е-1 «Оцінювання VR-проєкту та мікровикладання»</h3>
          <p className="instr-note">
            Кожен параметр оцінюється викладачем за шкалою 0–3: 0 — відсутній · 1 — фрагментарно · 2 — достатньо ·
            3 — повно, творчо. Максимум — 36 балів. Низький: 0–21 · середній: 22–30 · високий: 31–36. Подання
            проєкту та оцінку викладача буде видно у розділі «Мій прогрес» після входу в акаунт.
          </p>
          <RubricInstrument blocks={e1Blocks} />
        </div>
      )}

      {active === 's1' && (
        <div className="instrument visible">
          <h3>Шкала С-1 «Самооцінка рефлексійної готовності»</h3>
          <p className="instr-note">Оцініть кожне твердження: 1 — зовсім не про мене … 5 — повністю про мене.</p>
          <LikertInstrument id="s1" items={s1Items} bounds={[29, 42]} criterionLabel="Оцінно-рефлексійний критерій" />
        </div>
      )}
    </section>
  );
}
