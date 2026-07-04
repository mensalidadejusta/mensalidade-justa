import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const src = join(process.cwd(), 'src');

const replacements = [
  // text colors
  [/text-\[var\(--color-text\)\]/g, 'text-text'],
  [/text-\[var\(--color-text-secondary\)\]/g, 'text-text-secondary'],
  [/text-\[var\(--color-text-tertiary\)\]/g, 'text-text-tertiary'],
  [/text-\[var\(--color-primary\)\]/g, 'text-primary'],
  [/text-\[var\(--color-danger\)\]/g, 'text-danger'],
  // bg colors
  [/bg-\[var\(--color-surface\)\]/g, 'bg-surface'],
  [/bg-\[var\(--color-surface-hover\)\]/g, 'bg-surface-hover'],
  [/bg-\[var\(--color-bg\)\]/g, 'bg-bg'],
  [/bg-\[var\(--color-primary\)\]/g, 'bg-primary'],
  [/bg-\[var\(--color-danger\)\]/g, 'bg-danger'],
  // border colors
  [/border-\[var\(--color-border\)\]/g, 'border-border'],
  [/border-\[var\(--color-border-hover\)\]/g, 'border-border-hover'],
  [/border-\[var\(--color-primary\)\]/g, 'border-primary'],
  // with opacity modifiers
  [/bg-\[var\(--color-primary\)\]\/(\d+)/g, 'bg-primary/$1'],
  [/bg-\[var\(--color-purple\)\]\/(\d+)/g, 'bg-purple/$1'],
  [/bg-\[var\(--color-coral\)\]\/(\d+)/g, 'bg-coral/$1'],
  [/border-\[var\(--color-primary\)\]\/(\d+)/g, 'border-primary/$1'],
  [/border-\[var\(--color-border\)\]\/(\d+)/g, 'border-border/$1'],
  [/text-\[var\(--color-primary\)\]\/(\d+)/g, 'text-primary/$1'],
  [/text-\[var\(--color-text-secondary\)\]\/(\d+)/g, 'text-text-secondary/$1'],
  // other
  [/ring-\[var\(--color-primary\)\]\/(\d+)/g, 'ring-primary/$1'],
];

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const original = content;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  Fixed: ${filePath}`);
  }
}

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next' && entry !== '.git') {
        walk(full);
      }
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      processFile(full);
    }
  }
}

console.log('Replacing arbitrary value classes with Tailwind v4 theme utilities...');
walk(src);
console.log('Done!');
