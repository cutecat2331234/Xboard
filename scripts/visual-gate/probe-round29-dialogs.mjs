#!/usr/bin/env node
/**
 * Extended admin dialog parity — delegates to visual-gate.mjs (canonical harness).
 * Each scenario maps 1:1 to a visual-gate DIALOG_ROUTES entry (≤2% threshold).
 * Retries each scenario up to 3× (7002 Octane can flake after long suite runs).
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

const MAX_ATTEMPTS = Number(process.env.PROBE_RETRIES || 3)
const RETRY_DELAY_MS = Number(process.env.PROBE_RETRY_DELAY_MS || 8000)

/** probe scenario id -> visual-gate route */
const SCENARIOS = [
  { id: 'user-edit', route: 'user-edit' },
  { id: 'user-create', route: 'user-create' },
  { id: 'user-mail', route: 'user-mail' },
  { id: 'gift-template-edit', route: 'gift-template' },
  { id: 'plan-add', route: 'plan-add' },
  { id: 'server-add', route: 'server-add' },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function runRoute(route) {
  return spawnSync('node', ['scripts/visual-gate/visual-gate.mjs'], {
    cwd: root,
    env: { ...env, ROUTES: route },
    encoding: 'utf8',
  })
}

const failures = []

for (const { id, route } of SCENARIOS) {
  console.log(`\n=== ${id} (visual-gate:${route}) ===`)
  let ok = false
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`${id}: retry ${attempt}/${MAX_ATTEMPTS} after ${RETRY_DELAY_MS}ms`)
      await sleep(RETRY_DELAY_MS)
    }
    const r = runRoute(route)
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim()
    if (out) console.log(out.split('\n').slice(-3).join('\n'))
    if (r.status === 0) {
      ok = true
      console.log(`${id}: PASS${attempt > 1 ? ` (attempt ${attempt})` : ''}`)
      break
    }
    if (attempt < MAX_ATTEMPTS) console.warn(`${id}: attempt ${attempt} failed (exit ${r.status})`)
  }
  if (!ok) failures.push(id)
}

if (failures.length) {
  console.error('\nPROBE_ROUND29_FAILED', failures)
  process.exit(1)
}
console.log('\nPROBE_ROUND29_PASS', SCENARIOS.length)
