#!/usr/bin/env node
/**
 * Extended admin dialog parity — delegates to visual-gate.mjs (canonical harness).
 * Each scenario maps 1:1 to a visual-gate DIALOG_ROUTES entry (≤2% threshold).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const env = {
  ...process.env,
  REF_BASE: process.env.VG_REF || process.env.REF_BASE || 'http://43.248.77.134:7001',
  CMP_BASE: process.env.VG_CMP || process.env.CMP_BASE || 'http://43.248.77.134:7002',
  SECURE_PATH: process.env.VG_SECURE || process.env.SECURE_PATH || 'd7f5c92b',
  ADMIN_LOCALE: process.env.ADMIN_LOCALE || 'zh-CN',
  SIDE: 'admin',
}

/** probe scenario id -> visual-gate route */
const SCENARIOS = [
  { id: 'user-edit', route: 'user-edit' },
  { id: 'user-create', route: 'user-create' },
  { id: 'user-mail', route: 'user-mail' },
  { id: 'gift-template-edit', route: 'gift-template' },
  { id: 'plan-add', route: 'plan-add' },
  { id: 'server-add', route: 'server-add' },
]

const failures = []

for (const { id, route } of SCENARIOS) {
  console.log(`\n=== ${id} (visual-gate:${route}) ===`)
  const r = spawnSync('node', ['scripts/visual-gate/visual-gate.mjs'], {
    cwd: root,
    env: { ...env, ROUTES: route },
    encoding: 'utf8',
  })
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim()
  if (out) console.log(out.split('\n').slice(-3).join('\n'))
  if (r.status !== 0) failures.push(id)
  else console.log(`${id}: PASS`)
}

if (failures.length) {
  console.error('\nPROBE_ROUND29_FAILED', failures)
  process.exit(1)
}
console.log('\nPROBE_ROUND29_PASS', SCENARIOS.length)
