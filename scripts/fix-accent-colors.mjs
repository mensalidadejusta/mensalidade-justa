import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'src/components/caixa-busca-localizacao.tsx',
  'src/components/searchable-select.tsx',
  'src/components/botao-tema.tsx',
  'src/app/busca/busca-content.tsx',
  'src/app/busca/busca-results.tsx',
  'src/components/footer.tsx',
  'src/app/escola/[slug]/escola-detalhe.tsx',
];

const replacements = [
  // Purple accent: #a855f7 -> uses theme var via classes
  [/bg-\[#a855f7\]\/10/g, 'bg-purple-500/10'],
  [/bg-\[#a855f7\]\/15/g, 'bg-purple-500/15'],
  [/bg-\[#a855f7\]\/20/g, 'bg-purple-500/20'],
  [/text-\[#a855f7\]/g, 'text-purple-500'],
  [/border-\[#a855f7\]\/20/g, 'border-purple-500/20'],
  [/border-\[#a855f7\]\/40/g, 'border-purple-500/40'],
  [/ring-\[#a855f7\]\/20/g, 'ring-purple-500/20'],
  [/focus:border-\[#a855f7\]/g, 'focus:border-purple-500'],

  // Purple accent: #b76dff -> uses theme var
  [/bg-\[#b76dff\]\/10/g, 'bg-purple-500/10'],
  [/bg-\[#b76dff\]\/20/g, 'bg-purple-500/20'],
  [/text-\[#b76dff\]/g, 'text-purple-500'],

  // Purple accent: #a855f7 (focus ring)
  [/focus:ring-\[#a855f7\]\/20/g, 'focus:ring-purple-500/20'],

  // Green accent: bg-emerald-500 -> use success
  [/bg-emerald-500\/10/g, 'bg-success/10'],
  [/border-emerald-500\/40/g, 'border-success/40'],
  [/text-emerald-400/g, 'text-success'],
  [/bg-emerald-500/g, 'bg-success'],

  // Blue primary: #4285f4 -> uses theme var
  [/bg-\[#4285f4\]/g, 'bg-primary'],
  [/from-\[#4285f4\]/g, 'from-primary'],

  // Purple gradient
  [/to-\[#8b5cf6\]/g, 'to-purple-500'],

  // Error red
  [/text-\[#ef4444\]/g, 'text-danger'],
  [/bg-\[#ef4444\]/g, 'bg-danger'],
];

for (const filePath of files) {
  const full = join(process.cwd(), filePath);
  try {
    let content = readFileSync(full, 'utf-8');
    const original = content;
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    if (content !== original) {
      writeFileSync(full, content, 'utf-8');
      console.log(`  Fixed: ${filePath}`);
    }
  } catch (e) {
    // skip if file doesn't exist
  }
}
console.log('Done!');
