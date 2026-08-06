// Одноразовий seed-скрипт: переносить контент із src/data/content.ts
// (той самий масив, що раніше рендерився хардкодом) у DynamoDB через
// Amplify Data. Ідемпотентний: спершу видаляє існуючі записи кожної
// моделі, потім створює контент наново — можна запускати повторно.
//
// Використання:
//   npx tsx scripts/seed-content.ts <шлях-до-amplify_outputs.json>

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn } from 'aws-amplify/auth';
import { readFileSync } from 'node:fs';
import type { Schema } from '../amplify/data/resource';
import {
  modules,
  matrixRows,
  readinessLevels,
  experimentStages,
  timeline,
  evidenceTiles,
  resources,
  a1Items,
  s1Items,
  t1Questions,
  e1Blocks,
} from '../src/data/content';

const outputsPath = process.argv[2];
if (!outputsPath) {
  console.error('Використання: npx tsx scripts/seed-content.ts <шлях-до-amplify_outputs.json>');
  process.exit(1);
}

const outputs = JSON.parse(readFileSync(outputsPath, 'utf-8'));
Amplify.configure(outputs);

const client = generateClient<Schema>();

// Контент пише лише група Admins — увійти тим самим акаунтом, яким
// логінились у застосунок (ADMIN_EMAIL/ADMIN_PASSWORD у середовищі).
async function signInAsAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Задайте ADMIN_EMAIL і ADMIN_PASSWORD у середовищі перед запуском seed-скрипта.');
    process.exit(1);
  }
  await signIn({ username: email, password });
}

async function clearModel(name: string, model: any) {
  const { data } = await model.list();
  for (const item of data) {
    await model.delete({ id: item.id });
  }
  console.log(`  видалено ${data.length} існуючих записів`);
}

async function seedModule() {
  console.log('Module...');
  await clearModel('Module', client.models.Module);
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    await client.models.Module.create({
      order: i,
      code: m.n,
      component: m.c,
      title: m.title,
      weeks: m.weeks,
      topics: m.topics,
      tasks: m.tasks,
      controlNote: m.ctrl,
    } as never);
  }
  console.log(`  створено ${modules.length}`);
}

async function seedMatrixRow() {
  console.log('MatrixRow...');
  await clearModel('MatrixRow', client.models.MatrixRow);
  for (let i = 0; i < matrixRows.length; i++) {
    const r = matrixRows[i];
    await client.models.MatrixRow.create({
      order: i,
      condition: r.condition,
      moduleRef: r.moduleRef,
      component: r.component,
      criterion: r.criterion,
      instrument: r.instrument,
    } as never);
  }
  console.log(`  створено ${matrixRows.length}`);
}

async function seedReadinessLevel() {
  console.log('ReadinessLevel...');
  await clearModel('ReadinessLevel', client.models.ReadinessLevel);
  for (let i = 0; i < readinessLevels.length; i++) {
    const l = readinessLevels[i];
    await client.models.ReadinessLevel.create({
      order: i,
      level: l.level,
      description: l.description,
      boundsPct: l.boundsPct,
    } as never);
  }
  console.log(`  створено ${readinessLevels.length}`);
}

async function seedResource() {
  console.log('Resource...');
  await clearModel('Resource', client.models.Resource);
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    await client.models.Resource.create({
      order: i,
      type: r.type,
      category: r.category,
      title: r.title,
      text: r.text,
    } as never);
  }
  console.log(`  створено ${resources.length}`);
}

async function seedExperimentStage() {
  console.log('ExperimentStage...');
  await clearModel('ExperimentStage', client.models.ExperimentStage);
  for (let i = 0; i < experimentStages.length; i++) {
    const s = experimentStages[i];
    await client.models.ExperimentStage.create({ order: i, n: s.n, title: s.title, text: s.text } as never);
  }
  console.log(`  створено ${experimentStages.length}`);
}

async function seedTimelineEntry() {
  console.log('TimelineEntry...');
  await clearModel('TimelineEntry', client.models.TimelineEntry);
  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    await client.models.TimelineEntry.create({ order: i, period: t.period, text: t.text } as never);
  }
  console.log(`  створено ${timeline.length}`);
}

async function seedEvidenceTile() {
  console.log('EvidenceTile...');
  await clearModel('EvidenceTile', client.models.EvidenceTile);
  for (let i = 0; i < evidenceTiles.length; i++) {
    const t = evidenceTiles[i];
    await client.models.EvidenceTile.create({ order: i, title: t.title, text: t.text } as never);
  }
  console.log(`  створено ${evidenceTiles.length}`);
}

async function seedDiagnostics() {
  console.log('DiagInstrument + DiagQuestion...');
  await clearModel('DiagInstrument', client.models.DiagInstrument);
  await clearModel('DiagQuestion', client.models.DiagQuestion);

  await client.models.DiagInstrument.create({
    code: 'a1',
    title: 'Анкета А-1 «Мотиваційно-ціннісне ставлення до застосування VR»',
    type: 'likert',
    instructions: 'Оцініть кожне твердження: 1 — цілком не згоден/на … 5 — цілком згоден/на.',
    boundsLow: 44,
    boundsHigh: 63,
  } as never);
  for (let i = 0; i < a1Items.length; i++) {
    await client.models.DiagQuestion.create({ instrumentCode: 'a1', order: i, text: a1Items[i] } as never);
  }

  await client.models.DiagInstrument.create({
    code: 's1',
    title: 'Шкала С-1 «Самооцінка рефлексійної готовності»',
    type: 'likert',
    instructions: 'Оцініть кожне твердження: 1 — зовсім не про мене … 5 — повністю про мене.',
    boundsLow: 29,
    boundsHigh: 42,
  } as never);
  for (let i = 0; i < s1Items.length; i++) {
    await client.models.DiagQuestion.create({ instrumentCode: 's1', order: i, text: s1Items[i] } as never);
  }

  await client.models.DiagInstrument.create({
    code: 't1',
    title: 'Тест Т-1 «Знання основ застосування VR у навчанні української мови та літератури»',
    type: 'test',
    instructions: 'Демоверсія: 12 завдань із 24 (по 3 на кожен змістовий блок). Оберіть одну відповідь у кожному завданні.',
  } as never);
  for (let i = 0; i < t1Questions.length; i++) {
    const q = t1Questions[i];
    await client.models.DiagQuestion.create({
      instrumentCode: 't1',
      order: i,
      block: q.block,
      text: q.q,
      options: q.options,
      correctIndex: q.correctIndex,
    } as never);
  }

  await client.models.DiagInstrument.create({
    code: 'e1',
    title: 'Експертна картка Е-1 «Оцінювання VR-проєкту та мікровикладання»',
    type: 'rubric',
    instructions:
      'Кожен параметр оцінюється викладачем за шкалою 0–3: 0 — відсутній · 1 — фрагментарно · 2 — достатньо · 3 — повно, творчо. Максимум — 36 балів. Низький: 0–21 · середній: 22–30 · високий: 31–36.',
    boundsLow: 21,
    boundsHigh: 30,
  } as never);
  let order = 0;
  for (const block of e1Blocks) {
    for (const c of block.criteria) {
      await client.models.DiagQuestion.create({
        instrumentCode: 'e1',
        order: order++,
        block: block.label,
        text: c.text,
        rubricCode: c.code,
        maxPoints: 3,
      } as never);
    }
  }
  console.log('  готово');
}

async function main() {
  await signInAsAdmin();
  await seedModule();
  await seedMatrixRow();
  await seedReadinessLevel();
  await seedResource();
  await seedExperimentStage();
  await seedTimelineEntry();
  await seedEvidenceTile();
  await seedDiagnostics();
  console.log('Seed завершено.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
