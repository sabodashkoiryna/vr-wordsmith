import { useEffect, useState } from 'react';
import { client } from '../../lib/amplify-client';
import { unwrap } from '../../lib/unwrap';
import { levelFromSum, LEVEL_LABEL } from '../../lib/scoring';
import type { Level } from '../../lib/scoring';
import type { RubricBlock } from '../../data/content';

type AttemptRow = {
  id: string;
  owner?: string | null;
  instrumentCode: string;
  phase?: string | null;
  score: number;
  maxScore: number;
  pct: number;
  level?: string | null;
  submittedAt: string;
};

type SubmissionRow = {
  id: string;
  owner?: string | null;
  title: string;
  description?: string | null;
  linkOrFileKey?: string | null;
  videoKey?: string | null;
  status?: string | null;
  teacherScores?: unknown;
  teacherComment?: string | null;
  totalScore?: number | null;
  level?: string | null;
};

function parseScores(v: unknown): Record<string, number> {
  // a.json() зберігає значення як рядок із JSON
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return (v as Record<string, number>) ?? {};
}

function toCsv(rows: AttemptRow[]): string {
  const header = ['id', 'owner', 'instrumentCode', 'phase', 'score', 'maxScore', 'pct', 'level', 'submittedAt'];
  const lines = rows.map((r) =>
    header.map((h) => JSON.stringify((r as unknown as Record<string, unknown>)[h] ?? '')).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ScoringForm({
  submission,
  e1Blocks,
  onSaved,
}: {
  submission: SubmissionRow;
  e1Blocks: RubricBlock[];
  onSaved: () => void;
}) {
  const initial = parseScores(submission.teacherScores);
  const [scores, setScores] = useState<Record<string, number>>(initial);
  const [comment, setComment] = useState(submission.teacherComment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = e1Blocks.flatMap((b) => b.criteria).reduce((sum, c) => sum + (scores[c.code] ?? 0), 0);
  const level: Level = levelFromSum(total, [21, 30]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await unwrap(
        client.models.ProjectSubmission.update({
          id: submission.id,
          teacherScores: JSON.stringify(scores), // a.json() зберігає рядок, не об'єкт
          teacherComment: comment,
          totalScore: total,
          level,
          status: 'reviewed',
        } as never),
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти оцінку.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-crud-form" style={{ maxWidth: 760 }}>
      {e1Blocks.map((block) => (
        <div key={block.label}>
          <h4>{block.label}</h4>
          {block.criteria.map((c) => (
            <label key={c.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <span style={{ minWidth: 220 }}>
                {c.code} · {c.text}
              </span>
              <select
                value={scores[c.code] ?? 0}
                onChange={(e) => setScores((s) => ({ ...s, [c.code]: Number(e.target.value) }))}
              >
                {[0, 1, 2, 3].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ))}
      <label>
        Коментар викладача
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <p>
        <b>
          Сума: {total} / 36 · рівень: {LEVEL_LABEL[level]}
        </b>
      </p>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" onClick={save} disabled={saving}>
        {saving ? 'Збереження…' : 'Зберегти оцінку'}
      </button>
    </div>
  );
}

export default function ResultsAdmin() {
  const [tab, setTab] = useState<'attempts' | 'submissions'>('attempts');
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [e1Blocks, setE1Blocks] = useState<RubricBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoring, setScoring] = useState<SubmissionRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, s, questions] = await Promise.all([
        unwrap(client.models.Attempt.list()),
        unwrap(client.models.ProjectSubmission.list()),
        unwrap(client.models.DiagQuestion.list()),
      ]);
      setAttempts(a as AttemptRow[]);
      setSubmissions(s as SubmissionRow[]);

      const byBlock = new Map<string, RubricBlock>();
      for (const q of questions) {
        if (q.instrumentCode !== 'e1') continue;
        const label = q.block ?? '';
        if (!byBlock.has(label)) byBlock.set(label, { label, maxPoints: 0, criteria: [] });
        const block = byBlock.get(label)!;
        block.criteria.push({ code: q.rubricCode ?? '', text: q.text });
        block.maxPoints += q.maxPoints ?? 3;
      }
      setE1Blocks([...byBlock.values()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бекенд ще не розгорнуто.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="tag-tabs">
        <button className={tab === 'attempts' ? 'active' : ''} onClick={() => setTab('attempts')}>
          Діагностика (А-1, Т-1, С-1)
        </button>
        <button className={tab === 'submissions' ? 'active' : ''} onClick={() => setTab('submissions')}>
          Проєкти модуля 4 (Е-1)
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <p className="instr-note">Завантаження…</p>}

      {!loading && tab === 'attempts' && (
        <div>
          <div className="admin-crud-head">
            <h3>Результати діагностики</h3>
            <button className="btn ghost" onClick={() => downloadCsv('attempts.csv', toCsv(attempts))}>
              Експорт CSV
            </button>
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Користувач</th>
                  <th>Інструмент</th>
                  <th>Фаза</th>
                  <th>Бал</th>
                  <th>%</th>
                  <th>Рівень</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.owner}</td>
                    <td>{a.instrumentCode}</td>
                    <td>{a.phase}</td>
                    <td>
                      {a.score}/{a.maxScore}
                    </td>
                    <td>{a.pct}</td>
                    <td>{a.level}</td>
                    <td>{new Date(a.submittedAt).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr>
                    <td colSpan={7}>Ще немає жодної спроби.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'submissions' && (
        <div>
          <h3>Подання проєктів</h3>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Користувач</th>
                  <th>Назва</th>
                  <th>Статус</th>
                  <th>Сума Е-1</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.owner}</td>
                    <td>{s.title}</td>
                    <td>{s.status}</td>
                    <td>{s.totalScore ?? '—'}</td>
                    <td>
                      <button className="btn ghost" onClick={() => setScoring(s)}>
                        Оцінити (Е-1)
                      </button>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5}>Ще немає подань.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {scoring && (
            <div style={{ marginTop: 20 }}>
              <h4>Оцінювання: {scoring.title}</h4>
              <ScoringForm
                submission={scoring}
                e1Blocks={e1Blocks}
                onSaved={() => {
                  setScoring(null);
                  load();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
