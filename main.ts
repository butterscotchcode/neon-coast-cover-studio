// Neon Coast Cover Studio — entry program (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file into
// the output directory and writes dossier.json with the vendored make.fun
// library, so the sealed scorer can check the entry and the judge can read
// it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The app itself is plain static files under app/ (index.html plus its ES
// modules, OFL fonts and code-drawn sample scenes) and needs no build step.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a stale file can never ride along.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps from the kit's reference/gate.json: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, app/ at most
// 993 files and 48 MiB in all. The output as a whole shares the platform's
// 1,000-entry / 64 MiB cap, so the app leaves room for the screenshots and
// the dossier beside it.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Coast entry written to ${outputDir}`);
