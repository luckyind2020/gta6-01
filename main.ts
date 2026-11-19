// Sunset Bay entrypoint (Node 22, standard library only). The game itself is
// the static files under game/ — a desktop browser loads game/index.html
// offline, no libraries and no network requests. This program hands the game
// in: it copies game/ and screenshots/ beside it into the output directory
// and writes the dossier.json the judge reads, using the kit's own library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    for (const name of readdirSync(shotsDir)) {
      if (name.startsWith('.')) continue;
      cpSync(join(shotsDir, name), join(outDir, 'screenshots', name));
    }
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const shots = readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.'));
  console.log(`handed in ${shots.length} screenshots to ${outDir}`);
}

handIn();
