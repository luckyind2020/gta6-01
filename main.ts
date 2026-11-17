// Sunset Bay — make.fun entry program (Node 22, standard library only).
//
// It hands the game in: copies this repository's game/ and screenshots/
// beside this file into the output directory (MAKEFUN_OUTPUT_DIR
// outside the grader, /output inside it) and writes dossier.json there
// with the vendored make.fun library, so the judge reads exactly the
// files the player plays. The copy is byte-for-byte and deterministic:
// running it twice writes the same bytes twice.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name) {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) return;
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Sunset Bay entry written to ${outDir} (${dossier.length} bytes of dossier)`);
