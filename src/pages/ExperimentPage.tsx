import { useEffect, useState } from 'react';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';

type Stage = { id: string; order: number; n: string; title: string; text: string };
type Timeline = { id: string; order: number; period: string; text: string };
type Evidence = { id: string; order: number; title: string; text: string };

export default function ExperimentPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, e] = await Promise.all([
          unwrap(client.models.ExperimentStage.list({ authMode: 'identityPool' })),
          unwrap(client.models.TimelineEntry.list({ authMode: 'identityPool' })),
          unwrap(client.models.EvidenceTile.list({ authMode: 'identityPool' })),
        ]);
        setStages([...s].sort((a, b) => a.order - b.order) as Stage[]);
        setTimeline([...t].sort((a, b) => a.order - b.order) as Timeline[]);
        setEvidence([...e].sort((a, b) => a.order - b.order) as Evidence[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити дані.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="page">
      <div className="eyebrow">Підрозділ 3.1 · організація дослідження</div>
      <h2>Три етапи експерименту</h2>
      {loading && <p className="instr-note">Завантаження…</p>}
      {error && <p className="error">{error}</p>}
      <div className="stages">
        {stages.map((s) => (
          <div className="stage" data-n={s.n} key={s.id}>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </div>
        ))}
      </div>

      <div className="timeline">
        <h2>Календарний план</h2>
        {timeline.map((t) => (
          <div className="trow" key={t.id}>
            <span>{t.period}</span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 50 }}>Що додатково посилює доказовість</h2>
      <div className="threecol" style={{ marginTop: 10 }}>
        {evidence.map((tile) => (
          <div className="tile" key={tile.id}>
            <b>{tile.title}</b>
            <p>{tile.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
