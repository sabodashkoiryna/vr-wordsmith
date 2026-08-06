import { resources } from '../data/content';

export default function ResourcesPage() {
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
      <div className="rgrid">
        {projects.map((r) => (
          <div className="rcard" key={r.title}>
            <small>{r.category}</small>
            <b>{r.title}</b>
            <p>{r.text}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 50 }}>Інструменти майстерні</h2>
      <div className="rgrid">
        {tools.map((r) => (
          <div className="rcard" key={r.title}>
            <small>{r.category}</small>
            <b>{r.title}</b>
            <p>{r.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
