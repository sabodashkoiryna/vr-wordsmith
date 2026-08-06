import { matrixRows, readinessLevels } from '../data/content';

export default function MatrixPage() {
  return (
    <section className="page">
      <div className="eyebrow">Методологічний каркас</div>
      <h2>Матриця «умова — модуль — компонент — діагностика»</h2>
      <p className="instr-note">
        Наскрізна відповідність доводить: експеримент не випадковий, а прямо реалізує
        структурно-функціональну модель дослідження.
      </p>
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
            {matrixRows.map((r) => (
              <tr key={r.condition}>
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
            {readinessLevels.map((l) => (
              <tr key={l.level}>
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
