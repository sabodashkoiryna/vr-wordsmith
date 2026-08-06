import { useState } from 'react';
import type { TestQuestion } from '../../data/content';
import { LEVEL_LABEL, levelFromPct } from '../../lib/scoring';

export default function TestInstrument({ questions }: { questions: TestQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answered = Object.keys(answers).length;
  const score = questions.reduce((acc, item, i) => acc + (answers[i] === item.correctIndex ? 1 : 0), 0);
  const pct = Math.round((score / questions.length) * 100);
  const level = submitted && answered === questions.length ? levelFromPct(pct) : null;

  return (
    <div>
      {questions.map((item, i) => (
        <div key={i}>
          {item.block && <h4 className="diag-block-label">{item.block}</h4>}
          <div className="qitem">
            <p>
              <span className="qnum">{String(i + 1).padStart(2, '0')}</span>
              {item.q}
            </p>
            <div className="opts">
              {item.options.map((o, j) => {
                const chosen = answers[i] === j;
                let cls = '';
                if (submitted) {
                  if (j === item.correctIndex) cls = 'correct';
                  else if (chosen) cls = 'wrong';
                }
                return (
                  <label key={j} className={cls}>
                    <input
                      type="radio"
                      name={`t1q${i}`}
                      checked={chosen}
                      onChange={() => setAnswers((prev) => ({ ...prev, [i]: j }))}
                    />
                    {String.fromCharCode(1072 + j)}) {o}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <button className="btn primary" onClick={() => setSubmitted(true)}>
        Перевірити відповіді
      </button>
      {submitted && (
        <div className={`result visible${level ? ' ' + level : ' mid'}`} role="status">
          {answered < questions.length ? (
            <>
              <b>Відповіді дано на {answered} із {questions.length} завдань</b>
              Завершіть тест, щоб побачити рівень.
            </>
          ) : (
            <>
              <b>
                {score} із {questions.length} правильних ({pct}%) · рівень: {LEVEL_LABEL[level!]}
              </b>
              Знаннєвий критерій. Правильні відповіді підсвічено зеленим, помилкові — рожевим.
            </>
          )}
        </div>
      )}
    </div>
  );
}
