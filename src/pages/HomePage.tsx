import { Link } from 'react-router-dom';
import Portal from '../components/Portal';

const PATH_STAGES = ['Споживач', 'Аналітик', 'Проєктувальник', 'Практик', 'Експерт'];

export default function HomePage() {
  return (
    <section className="page">
      <div className="hero">
        <div>
          <div className="eyebrow">Онлайн-платформа підготовки майбутніх учителів</div>
          <h1>Українська словесність зустрічає віртуальну реальність</h1>
          <p className="lead">
            Навчальний курс для майбутніх учителів української мови та літератури: від першого
            занурення у віртуальний світ художнього твору — до власного VR-уроку.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
            <Link className="btn primary" to="/modules">
              Перейти до модулів
            </Link>
            <Link className="btn ghost" to="/diag">
              Пройти діагностику
            </Link>
          </div>
          <div className="path" aria-label="Траєкторія розвитку">
            {PATH_STAGES.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
        <Portal />
      </div>

      <div className="threecol">
        <div className="tile">
          <b>60 годин · 2 кредити ЄКТС</b>
          <p>5 модулів упродовж семестру: 20 годин синхронної роботи та 40 годин самостійної роботи на платформі.</p>
        </div>
        <div className="tile">
          <b>Бюджетні технології</b>
          <p>Cardboard-окуляри зі смартфоном, 360°-тури, CoSpaces Edu і ThingLink — рішення, реалістичні для української школи.</p>
        </div>
        <div className="tile">
          <b>Портфоліо замість іспиту</b>
          <p>Підсумок курсу — власний VR-фрагмент уроку, проведене мікровикладання та дві експертні рецензії.</p>
        </div>
      </div>
    </section>
  );
}
