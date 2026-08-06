import { useEffect, useState } from 'react';
import { client } from '../lib/amplify-client';
import { unwrap } from '../lib/unwrap';

type MatrixRow = {
  id: string;
  order: number;
  condition: string;
  moduleRef: string;
  component: string;
  criterion: string;
  instrument: string;
};

type ReadinessLevel = {
  id: string;
  order: number;
  level: string;
  description: string;
  boundsPct: string;
};

export default function MatrixPage() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [levels, setLevels] = useState<ReadinessLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rowsData, levelsData] = await Promise.all([
          unwrap(client.models.MatrixRow.list({ authMode: 'identityPool' })),
          unwrap(client.models.ReadinessLevel.list({ authMode: 'identityPool' })),
        ]);
        setRows([...rowsData].sort((a, b) => a.order - b.order) as MatrixRow[]);
        setLevels([...levelsData].sort((a, b) => a.order - b.order) as ReadinessLevel[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити матрицю.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="page">
      <div className="eyebrow">Методологічний каркас</div>
      <h2>Матриця «умова — модуль — компонент — діагностика»</h2>
      <p className="instr-note">
        Наскрізна відповідність доводить: експеримент не випадковий, а прямо реалізує
        структурно-функціональну модель дослідження.
      </p>
      {loading && <p className="instr-note">Завантаження…</p>}
      {error && <p className="error">{error}</p>}
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Педагогічна умова</th>
              <th>Модуль платформи</th>
              <th>Компонент готовності</th>
              <th>Критерій</th>
              <th>Інструмент</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.condition}</td>
                <td>{r.moduleRef}</td>
                <td>
                  <span className="chip d">{r.component}</span>
                </td>
                <td>{r.criterion}</td>
                <td>{r.instrument}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 50 }}>Рівні готовності</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Рівень</th>
              <th>Характеристика</th>
              <th>Межі (від максимуму інструмента)</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.id}>
                <td>
                  <b>{l.level}</b>
                </td>
                <td>{l.description}</td>
                <td>{l.boundsPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
