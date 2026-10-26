#!/usr/bin/env node
// Checks that this computer can run Beatframe. Usage: node doctor.mjs [project-dir]
import { spawnSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
import { resolve } from 'node:path';

const results = [];
const check = (name, ok, detail, fix, required = true) => results.push({ name, ok, detail, fix, required });

const [maj, min] = process.versions.node.split('.').map(Number);
check('Node.js >= 22.18', maj > 22 || (maj === 22 && min >= 18), `found ${process.versions.node}`, 'Install Node 22 LTS or newer from https://nodejs.org (needed to run the TypeScript label helpers from scripts).');

const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
check('ffmpeg', ff.status === 0, ff.status === 0 ? ff.stdout.split('\n')[0] : 'not found', 'macOS: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg');

const npm = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['-v'], { encoding: 'utf8', shell: process.platform === 'win32' });
check('npm', npm.status === 0, npm.status === 0 ? npm.stdout.trim() : 'not found', 'npm comes with Node.js');

const uv = spawnSync('uv', ['--version'], { encoding: 'utf8' });
check('uv (optional)', uv.status === 0, uv.status === 0 ? uv.stdout.trim() : 'not found', 'Only needed for the full analyzer in a later version: https://docs.astral.sh/uv/', false);

try {
  const s = statfsSync(resolve(process.argv[2] ?? '.'));
  const gb = (s.bavail * s.bsize) / 1e9;
  check('Free disk space >= 1 GB', gb >= 1, `${gb.toFixed(1)} GB free`, 'A project needs about 300 MB for node_modules plus room for renders.');
} catch { /* statfs not available */ }

for (const r of results) console.log(`${r.ok ? 'ok  ' : r.required ? 'FAIL' : 'skip'}  ${r.name}: ${r.detail}${r.ok ? '' : `\n      ${r.fix}`}`);
process.exit(results.some(r => r.required && !r.ok) ? 1 : 0);
