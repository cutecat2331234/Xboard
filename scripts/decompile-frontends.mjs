#!/usr/bin/env node
/**
 * webcrack legacy bundles → decompiled/user|admin (auxiliary material).
 * Requires: npm i -D webcrack (in scripts/decompile)
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const decompileDir = path.join(root, 'scripts', 'decompile')
const pkg = path.join(decompileDir, 'package.json')

if (!fs.existsSync(pkg)) {
  fs.mkdirSync(decompileDir, { recursive: true })
  fs.writeFileSync(
    pkg,
    JSON.stringify({ private: true, type: 'module', devDependencies: { webcrack: '^2.15.1' } }, null, 2),
  )
  spawnSync('npm', ['install'], { cwd: decompileDir, stdio: 'inherit', shell: true })
}

const targets = [
  {
    input: path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'),
    out: path.join(root, 'decompiled/user'),
  },
  {
    input: path.join(root, 'legacy-dist/public/assets/admin/assets/index-BdbgNvrf.js'),
    out: path.join(root, 'decompiled/admin'),
  },
]

for (const t of targets) {
  if (!fs.existsSync(t.input)) {
    console.warn('skip missing', t.input)
    continue
  }
  fs.mkdirSync(t.out, { recursive: true })
  console.log('webcrack', t.input, '→', t.out)
  const r = spawnSync(
    'npx',
    ['webcrack', t.input, '-o', t.out, '--force'],
    {
      cwd: decompileDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
    },
  )
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('DECOMPILE_DONE')
