import { experimentStages, timeline, evidenceTiles } from '../data/content';

export default function ExperimentPage() {
  return (
    <section className="page">
      <div className="eyebrow">Підрозділ 3.1 · організація дослідження</div>
      <h2>Три етапи експерименту</h2>
      <div className="stages">
        {experimentStages.map((s) => (
          <div className="stage" data-n={s.n} key={s.n}>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </div>
        ))}
      </div>

      <div className="timeline">
        <h2>Календарний план</h2>
        {timeline.map((t) => (
          <div className="trow" key={t.period}>
            <span>{t.period}</span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 50 }}>Що додатково посилює доказовість</h2>
      <div className="threecol" style={{ marginTop: 10 }}>
        {evidenceTiles.map((tile) => (
          <div className="tile" key={tile.title}>
            <b>{tile.title}</b>
            <p>{tile.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
