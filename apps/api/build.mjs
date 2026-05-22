// Post-build asset copy.
//
// `tsc` only emits compiled `.ts` files into `dist/`. The Prisma-generated
// client (under `src/generated/prisma/`) is a mix of `.js` runtime files and
// `.d.ts` declarations — none of which `tsc` will process or copy. We mirror
// the entire generated tree into `dist/` so that compiled imports like
// `./generated/prisma/index.js` resolve at runtime.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join('src', 'generated');
const DST = join('dist', 'generated');

if (!existsSync(SRC)) {
  console.error(`build.mjs: ${SRC} is missing. Run \`prisma generate\` first.`);
  process.exit(1);
}

rmSync(DST, { recursive: true, force: true });
cpSync(SRC, DST, { recursive: true });
console.log(`build.mjs: copied ${SRC} → ${DST}`);
