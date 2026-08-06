import { useState } from 'react';
import { LEVEL_LABEL, levelFromSum } from '../../lib/scoring';

const SCALE = [1, 2, 3, 4, 5];

export default function LikertInstrument({
  id,
  items,
  bounds,
  criterionLabel,
}: {
  id: string;
  items: string[];
  bounds: [number, number];
  criterionLabel: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answered = Object.keys(answers).length;
  const sum = Object.values(answers).reduce((a, b) => a + b, 0);
  const max = items.length * 5;

  function setAnswer(i: number, v: number) {
    setAnswers((prev) => ({ ...prev, [i]: v }));
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  const level = submitted && answered === items.length ? levelFromSum(sum, bounds) : null;
  const pct = Math.round((sum / max) * 100);

  return (
    <div>
      {items.map((q, i) => (
        <div className="qitem" key={i}>
          <p>
            <span className="qnum">{String(i + 1).padStart(2, '0')}</span>
            {q}
          </p>
          <div className="likert">
            {SCALE.map((v) => (
              <label key={v}>
                <input
                  type="radio"
                  name={`${id}q${i}`}
                  value={v}
                  checked={answers[i] === v}
                  onChange={() => setAnswer(i, v)}
                />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn primary" onClick={handleSubmit}>
        Обчислити результат
      </button>
      {submitted && (
        <div className={`result visible${level ? ' ' + level : ' mid'}`} role="status">
          {answered < items.length ? (
            <>
              <b>Заповнено {answered} із {items.length}</b>
              Дайте відповідь на всі твердження, щоб обчислити рівень.
            </>
          ) : (
            <>
              <b>
                {sum} із {max} балів ({pct}%) · рівень: {LEVEL_LABEL[level!]}
              </b>
              {criterionLabel}. Результат фіксується у зведеній відомості констатувального / контрольного зрізу.
            </>
          )}
        </div>
      )}
    </div>
  );
}
