// Одноразовий скрипт: завантажує self-hosted woff2 з Google Fonts і генерує
// src/styles/fonts.css. Причина не лишати <link> на fonts.googleapis.com —
// це рендер-блокуючий сторонній запит на критичному шляху лендінгу.
//
// Підмножини: latin + cyrillic. cyrillic-ext НЕ потрібен: діапазон `cyrillic`
// (U+0400-045F, U+0490-0491, ...) уже містить усі українські літери,
// включно з І/Ї/Є/Ґ.
//
// Запуск:  node scripts/fetch-fonts.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/fonts');

// Сучасний UA — щоб Google віддав woff2, а не ttf.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const FAMILIES = [
  { css: 'Unbounded:wght@600;800', file: 'unbounded' },
  { css: 'IBM+Plex+Sans:wght@400;500;600', file: 'plex-sans' },
  { css: 'IBM+Plex+Serif:ital,wght@0,400;0,600;1,400', file: 'plex-serif' },
  { css: 'IBM+Plex+Mono:wght@400;500', file: 'plex-mono' },
];

const WANTED_SUBSETS = new Set(['latin', 'cyrillic']);

/** Розбиває CSS Google Fonts на блоки @font-face із коментарем-підмножиною. */
function parseFaces(css) {
  const faces = [];
  // Google ставить перед кожним блоком коментар /* latin */, /* cyrillic */ ...
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, subset, block] = m;
    const url = /src:\s*url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
    const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1].trim();
    const style = /font-style:\s*([^;]+);/.exec(block)?.[1].trim() ?? 'normal';
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1].trim();
    if (url && weight && family && range) {
      faces.push({ subset, url, weight, style, family, range });
    }
  }
  return faces;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const cssBlocks = [];

  for (const fam of FAMILIES) {
    const apiUrl = `https://fonts.googleapis.com/css2?family=${fam.css}&display=swap`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${apiUrl} → ${res.status}`);
    const css = await res.text();

    const faces = parseFaces(css).filter((f) => WANTED_SUBSETS.has(f.subset));
    if (faces.length === 0) throw new Error(`Не знайдено потрібних підмножин для ${fam.css}`);

    for (const f of faces) {
      const italic = f.style === 'italic' ? 'i' : '';
      const name = `${fam.file}-${f.weight}${italic}-${f.subset}.woff2`;
      const bin = await fetch(f.url).then((r) => r.arrayBuffer());
      await writeFile(resolve(outDir, name), Buffer.from(bin));
      cssBlocks.push(
        `@font-face {\n` +
          `  font-family: '${f.family}';\n` +
          `  font-style: ${f.style};\n` +
          `  font-weight: ${f.weight};\n` +
          `  font-display: swap;\n` +
          `  src: url('/fonts/${name}') format('woff2');\n` +
          `  unicode-range: ${f.range};\n` +
          `}`,
      );
      console.log(`✓ ${name} (${(bin.byteLength / 1024).toFixed(1)} КБ)`);
    }
  }

  const header =
    `/* ЗГЕНЕРОВАНО scripts/fetch-fonts.mjs — не редагувати вручну.\n` +
    `   Self-hosted woff2, підмножини latin + cyrillic.\n` +
    `   Перегенерувати: node scripts/fetch-fonts.mjs */\n\n`;
  await writeFile(resolve(root, 'src/styles/fonts.css'), header + cssBlocks.join('\n\n') + '\n');
  console.log(`\nЗаписано src/styles/fonts.css (${cssBlocks.length} @font-face)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
