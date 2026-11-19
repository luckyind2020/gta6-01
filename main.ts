// Sunset Bay — make.fun entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ and
// screenshots/ folders beside this file into the output directory
// (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it) and
// writes dossier.json there with the vendored make.fun library, so the
// judge reads exactly the files the player plays. The copy is
// byte-for-byte and deterministic: running it twice writes the same
// bytes twice.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(folder) {
  const from = join(repoDir, folder);
  const to = join(destDir, folder);
  if (!existsSync(from)) return;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(destDir, { recursive: true });
handIn('game');
handIn('screenshots');

const dossier = buildDossier(destDir, limits);
writeFileSync(join(destDir, 'dossier.json'), dossier);
console.log(`Sunset Bay entry written to ${destDir} (${dossier.length} bytes of dossier)`);
