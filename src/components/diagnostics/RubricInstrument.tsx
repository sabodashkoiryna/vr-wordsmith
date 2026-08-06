import { Fragment } from 'react';
import type { RubricBlock } from '../../data/content';

// MVP: картку Е-1 оцінює лише викладач/адмін (в адмін-панелі, крок 6 плану).
// Тут — лише довідковий вигляд рубрики для студента, без само-оцінювання.
export default function RubricInstrument({ blocks }: { blocks: RubricBlock[] }) {
  return (
    <div className="tablewrap">
      <table className="rubric">
        <thead>
          <tr>
            <th>Код</th>
            <th>Параметр оцінювання</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <Fragment key={block.label}>
              <tr>
                <td className="block-row" colSpan={2}>
                  {block.label}
                </td>
              </tr>
              {block.criteria.map((c) => (
                <tr key={c.code}>
                  <td>{c.code}</td>
                  <td>{c.text}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
