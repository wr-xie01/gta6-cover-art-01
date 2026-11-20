// Neon Coast Cover Studio — the entrypoint (Node 22, standard library only).
// Hands the app in: it copies app/ and screenshots/ from beside this file to
// the output directory and writes dossier.json with the vendored make.fun
// library, which is what the judge reads. Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Where this file lives, and where the grader wants the entry written.
const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, from the kit's gate: at most 4 screenshots of 256 KiB
// each, app/ at most 993 files and 48 MiB, and the dossier text at most
// 160 KiB. Refuse early with a clear message rather than handing in a
// package the scorer would refuse.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function countAppFiles(dir, base = dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const info = statSync(p);
    if (info.isDirectory()) {
      const sub = countAppFiles(p, base);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += info.size;
      const rel = p.slice(base.length + 1);
      if (Buffer.byteLength(rel, 'utf8') > CAPS.app_path_max_bytes) {
        fail(`app path over ${CAPS.app_path_max_bytes} bytes: ${rel}`);
      }
    }
  }
  return { files, bytes };
}

const appDir = join(root, 'app');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
const appCount = countAppFiles(appDir);
if (appCount.files > CAPS.app_max_files) fail(`app/ holds ${appCount.files} files (cap ${CAPS.app_max_files})`);
if (appCount.bytes > CAPS.app_max_bytes) fail(`app/ holds ${appCount.bytes} bytes (cap ${CAPS.app_max_bytes})`);

const shotsDir = join(root, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((n) => !n.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
  fail(`screenshots/ holds ${shots.length} images (need 3 to ${CAPS.screenshots.max})`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > CAPS.screenshots.max_bytes) fail(`screenshot over 256 KiB: ${name}`);
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(
  `wrote ${outDir}: app/ (${appCount.files} files, ${appCount.bytes} bytes), ` +
    `${shots.length} screenshots, dossier.json (${dossier.length} bytes)`,
);
