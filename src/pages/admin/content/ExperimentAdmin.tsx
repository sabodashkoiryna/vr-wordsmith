import { useState } from 'react';
import CrudTable from '../../../components/admin/CrudTable';
import type { CrudField } from '../../../components/admin/CrudTable';
import { client } from '../../../lib/amplify-client';
import { unwrap } from '../../../lib/unwrap';

const stageFields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'n', label: 'Позначення (І/ІІ/ІІІ)', type: 'text' },
  { key: 'title', label: 'Назва етапу', type: 'text' },
  { key: 'text', label: 'Опис', type: 'textarea' },
];

const timelineFields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'period', label: 'Період', type: 'text' },
  { key: 'text', label: 'Опис', type: 'textarea' },
];

const evidenceFields: CrudField[] = [
  { key: 'order', label: '№', type: 'number' },
  { key: 'title', label: 'Назва', type: 'text' },
  { key: 'text', label: 'Опис', type: 'textarea' },
];

const TABS = ['stages', 'timeline', 'evidence'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  stages: 'Етапи експерименту',
  timeline: 'Календарний план',
  evidence: 'Що посилює доказовість',
};

export default function ExperimentAdmin() {
  const [tab, setTab] = useState<Tab>('stages');

  return (
    <div>
      <div className="tag-tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'stages' && (
        <CrudTable
          title={TAB_LABEL.stages}
          fields={stageFields}
          orderKey="order"
          list={() => unwrap(client.models.ExperimentStage.list())}
          create={(v) => unwrap(client.models.ExperimentStage.create(v as never))}
          update={(id, v) => unwrap(client.models.ExperimentStage.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.ExperimentStage.delete({ id }))}
        />
      )}

      {tab === 'timeline' && (
        <CrudTable
          title={TAB_LABEL.timeline}
          fields={timelineFields}
          orderKey="order"
          list={() => unwrap(client.models.TimelineEntry.list())}
          create={(v) => unwrap(client.models.TimelineEntry.create(v as never))}
          update={(id, v) => unwrap(client.models.TimelineEntry.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.TimelineEntry.delete({ id }))}
        />
      )}

      {tab === 'evidence' && (
        <CrudTable
          title={TAB_LABEL.evidence}
          fields={evidenceFields}
          orderKey="order"
          list={() => unwrap(client.models.EvidenceTile.list())}
          create={(v) => unwrap(client.models.EvidenceTile.create(v as never))}
          update={(id, v) => unwrap(client.models.EvidenceTile.update({ id, ...v } as never))}
          remove={(id) => unwrap(client.models.EvidenceTile.delete({ id }))}
        />
      )}
    </div>
  );
}
