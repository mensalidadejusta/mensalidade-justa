import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const src = join(process.cwd(), 'src');

const replacements = [
  // Background colors
  [/bg-\[#16161a\]/g, 'bg-surface'],
  [/bg-\[#1f1f23\]/g, 'bg-surface-hover'],
  [/bg-\[#231e27\]/g, 'bg-surface-hover'],
  [/bg-\[#131314\]/g, 'bg-bg'],
  [/bg-\[#0d0d0d\]/g, 'bg-bg'],
  [/bg-\[#0d0d0b\]/g, 'bg-bg'],
  [/bg-neutral-950/g, 'bg-bg'],
  [/bg-neutral-900/g, 'bg-surface'],
  [/bg-neutral-800/g, 'bg-surface-hover'],
  [/bg-neutral-700/g, 'bg-surface-hover'],
  [/bg-\[#f0f4f9\]/g, 'bg-bg'],

  // Text colors
  [/text-\[#eadfed\]/g, 'text-text'],
  [/text-\[#5a5260\]/g, 'text-text-tertiary'],
  [/text-\[#988d9f\]/g, 'text-text-secondary'],
  [/text-neutral-100/g, 'text-text'],
  [/text-neutral-500/g, 'text-text-tertiary'],
  [/text-\[#1f1f1f\]/g, 'text-text'],

  // Border colors
  [/border-\[#26262b\]/g, 'border-border'],
  [/border-neutral-800\/80/g, 'border-border/80'],
  [/border-neutral-800/g, 'border-border'],
  [/border-neutral-700/g, 'border-border'],
  [/border-r border-neutral-800/g, 'border-r border-border'],
  [/border-t border-neutral-800/g, 'border-t border-border'],
  [/divide-neutral-800\/80/g, 'divide-border/80'],

  // Hover states in dark theme
  [/hover:bg-neutral-900/g, 'hover:bg-surface-hover'],
  [/hover:bg-neutral-800/g, 'hover:bg-surface-hover'],
  [/hover:bg-neutral-700/g, 'hover:bg-surface-hover'],
  [/hover:bg-\[#1f1a23\]/g, 'hover:bg-surface-hover'],
  [/hover:bg-\[#1f1f23\]/g, 'hover:bg-surface-hover'],

  // Specific sobre page fixes
  [/dark:bg-\[#131314\]/g, 'dark:bg-bg'],
  [/dark:text-white/g, 'dark:text-text'],
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
    } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.css')) {
      processFile(full);
    }
  }
}

console.log('Replacing hardcoded dark/light colors with theme variables...');
walk(src);
console.log('Done!');
