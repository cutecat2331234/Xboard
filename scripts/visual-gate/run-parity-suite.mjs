#!/usr/bin/env node
/**
 * One-shot parity suite: user + admin visual-gate + audit-admin-full.
 * Exit 0 only when all three pass (7001 ref vs 7002 cmp).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const env = {
  ...process.env,
  REF_BASE: process.env.REF_BASE || 'http://43.248.77.134:7001',
  CMP_BASE: process.env.CMP_BASE || 'http://43.248.77.134:7002',
  SECURE_PATH: process.env.SECURE_PATH || 'd7f5c92b',
  ADMIN_LOCALE: process.env.ADMIN_LOCALE || 'zh-CN',
}

const steps = [
  {
    name: 'visual-gate user (16 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/visual-gate.mjs'],
    env: { ...env, SIDE: 'user' },
  },
  {
    name: 'visual-gate admin (39 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/visual-gate.mjs'],
    env: { ...env, SIDE: 'admin' },
  },
  {
    name: 'audit-admin-full (26 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/audit-admin-full.mjs'],
    env: { ...env },
  },
]

const failures = []

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`)
  const r = spawnSync(step.cmd, step.args, { cwd: root, env: step.env, stdio: 'inherit' })
  if (r.status !== 0) failures.push(step.name)
}

if (failures.length) {
  console.error('\nPARITY_SUITE_FAILED', failures)
  process.exit(1)
}
console.log('\nPARITY_SUITE_PASS user+admin+audit')
