// Fails when a stylesheet outgrows MAX_LINES — ESLint's max-lines only covers code.
// Split by concern instead (see packages/ui/src/styles/ for the pattern).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const MAX_LINES = 300;
const ROOTS = ['apps', 'packages'];
const SKIP = new Set(['node_modules', '.next', 'dist', 'generated']);

function* cssFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* cssFiles(path);
    else if (entry.name.endsWith('.css')) yield path;
  }
}

const tooBig = [];
for (const root of ROOTS) {
  for (const file of cssFiles(root)) {
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > MAX_LINES) tooBig.push(`  ${relative('.', file)}: ${lines} lines`);
  }
}

if (tooBig.length) {
  console.error(`CSS files over ${MAX_LINES} lines — split them by concern:\n${tooBig.join('\n')}`);
  process.exit(1);
}
