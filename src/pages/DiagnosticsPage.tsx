import { useEffect, useState } from 'react';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';
import LikertInstrument from '../components/diagnostics/LikertInstrument';
import TestInstrument from '../components/diagnostics/TestInstrument';
import RubricInstrument from '../components/diagnostics/RubricInstrument';
import type { TestQuestion, RubricBlock } from '../data/content';

const TABS = [
  { id: 'a1', label: 'Анкета А-1 · мотивація' },
  { id: 't1', label: 'Тест Т-1 · знання' },
  { id: 'e1', label: 'Картка Е-1 · проєкт' },
  { id: 's1', label: 'Шкала С-1 · рефлексія' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type DiagInstrumentRow = {
  code: string;
  title: string;
  instructions?: string | null;
  boundsLow?: number | null;
  boundsHigh?: number | null;
};

type DiagQuestionRow = {
  instrumentCode: string;
  order: number;
  block?: string | null;
  text: string;
  options?: (string | null)[] | null;
  correctIndex?: number | null;
  rubricCode?: string | null;
  maxPoints?: number | null;
};

export default function DiagnosticsPage() {
  const [active, setActive] = useState<TabId>('a1');
  const [instruments, setInstruments] = useState<Record<string, DiagInstrumentRow>>({});
  const [questionsByCode, setQuestionsByCode] = useState<Record<string, DiagQuestionRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [instrData, questData] = await Promise.all([
          unwrap(client.models.DiagInstrument.list()),
          unwrap(client.models.DiagQuestion.list()),
        ]);
        const byCode: Record<string, DiagInstrumentRow> = {};
        for (const i of instrData) byCode[i.code] = i as DiagInstrumentRow;
        setInstruments(byCode);

        const grouped: Record<string, DiagQuestionRow[]> = {};
        for (const q of questData as unknown as DiagQuestionRow[]) {
          (grouped[q.instrumentCode] ??= []).push(q);
        }
        for (const code in grouped) grouped[code].sort((a, b) => a.order - b.order);
        setQuestionsByCode(grouped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити інструментарій.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const a1 = instruments.a1;
  const s1 = instruments.s1;
  const t1 = instruments.t1;
  const e1 = instruments.e1;

  const t1Questions: TestQuestion[] = (questionsByCode.t1 ?? []).map((q) => ({
    block: q.block ?? undefined,
    q: q.text,
    options: (q.options ?? []).filter((o): o is string => o != null),
    correctIndex: q.correctIndex ?? -1,
  }));

  const e1Blocks: RubricBlock[] = (() => {
    const byBlock = new Map<string, RubricBlock>();
    for (const q of questionsByCode.e1 ?? []) {
      const label = q.block ?? '';
      if (!byBlock.has(label)) byBlock.set(label, { label, maxPoints: 0, criteria: [] });
      const block = byBlock.get(label)!;
      block.criteria.push({ code: q.rubricCode ?? '', text: q.text });
      block.maxPoints += q.maxPoints ?? 3;
    }
    return [...byBlock.values()];
  })();

  return (
    <section className="page">
      <div className="eyebrow">Діагностичний інструментарій</div>
      <h2>Виміряйте свою готовність</h2>
      <p className="instr-note">Інтерактивні версії інструментів констатувального та контрольного зрізів.</p>
      {loading && <p className="instr-note">Завантаження…</p>}
      {error && <p className="error">{error}</p>}
      <div className="diag-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {active === 'a1' && a1 && (
        <div className="instrument visible">
          <h3>{a1.title}</h3>
          <p className="instr-note">{a1.instructions}</p>
          <LikertInstrument
            id="a1"
            items={(questionsByCode.a1 ?? []).map((q) => q.text)}
            bounds={[a1.boundsLow ?? 0, a1.boundsHigh ?? 0]}
            criterionLabel="Мотиваційний критерій"
          />
        </div>
      )}

      {active === 't1' && t1 && (
        <div className="instrument visible">
          <h3>{t1.title}</h3>
          <p className="instr-note">{t1.instructions}</p>
          <TestInstrument questions={t1Questions} />
        </div>
      )}

      {active === 'e1' && e1 && (
        <div className="instrument visible">
          <h3>{e1.title}</h3>
          <p className="instr-note">{e1.instructions}</p>
          <RubricInstrument blocks={e1Blocks} />
        </div>
      )}

      {active === 's1' && s1 && (
        <div className="instrument visible">
          <h3>{s1.title}</h3>
          <p className="instr-note">{s1.instructions}</p>
          <LikertInstrument
            id="s1"
            items={(questionsByCode.s1 ?? []).map((q) => q.text)}
            bounds={[s1.boundsLow ?? 0, s1.boundsHigh ?? 0]}
            criterionLabel="Оцінно-рефлексійний критерій"
          />
        </div>
      )}
    </section>
  );
}
