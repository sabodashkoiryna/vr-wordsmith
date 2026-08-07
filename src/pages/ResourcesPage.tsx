import { useEffect, useState } from 'react';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';
import { usePublicAuthMode } from '../lib/publicAuthMode';

type ResourceItem = {
  id: string;
  order: number;
  type: string;
  category: string;
  title: string;
  text: string;
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authOpts = usePublicAuthMode();

  useEffect(() => {
    if (authOpts === null) return;
    (async () => {
      try {
        const data = await unwrap(client.models.Resource.list(authOpts));
        setResources([...data].sort((a, b) => a.order - b.order) as ResourceItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити ресурси.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authOpts]);

  const projects = resources.filter((r) => r.type === 'project');
  const tools = resources.filter((r) => r.type === 'tool');

  return (
    <section className="page">
      <div className="eyebrow">Модуль 4 · VR-майстерня</div>
      <h2>Теми проєктів і банк ресурсів</h2>
      <p className="instr-note">
        Орієнтовна тематика наскрізних проєктів — під конкретні твори шкільної програми. Кожен проєкт проходить три
        контрольні точки: ідея → технологічна карта → продукт + мікровикладання.
      </p>
      {loading && <p className="instr-note">Завантаження…</p>}
      {error && <p className="error">{error}</p>}
      <div className="rgrid">
        {projects.map((r) => (
          <div className="rcard" key={r.id}>
            <small>{r.category}</small>
            <b>{r.title}</b>
            <p>{r.text}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 50 }}>Інструменти майстерні</h2>
      <div className="rgrid">
        {tools.map((r) => (
          <div className="rcard" key={r.id}>
            <small>{r.category}</small>
            <b>{r.title}</b>
            <p>{r.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
