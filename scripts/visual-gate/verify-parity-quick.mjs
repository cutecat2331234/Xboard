#!/usr/bin/env node
/**
 * Fast parity smoke (~5–8 min): core user + admin pages + 6 dialog routes.
 * Full suite: node scripts/visual-gate/run-parity-suite.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseEnv = {
  ...process.env,
  REF_BASE: process.env.REF_BASE || 'http://43.248.77.134:7001',
  CMP_BASE: process.env.CMP_BASE || 'http://43.248.77.134:7002',
  SECURE_PATH: process.env.SECURE_PATH || 'd7f5c92b',
  ADMIN_LOCALE: process.env.ADMIN_LOCALE || 'zh-CN',
  USER_LOCALE: process.env.USER_LOCALE || 'en-US',
}

const steps = [
  {
    name: 'user core (login,dashboard,plan,order)',
    env: { ...baseEnv, SIDE: 'user', ROUTES: 'login,dashboard,plan,order' },
  },
  {
    name: 'admin core (sign-in,dashboard,user)',
    env: { ...baseEnv, SIDE: 'admin', ROUTES: 'sign-in,dashboard,user' },
  },
  {
    name: 'admin dialogs (6)',
    env: {
      ...baseEnv,
      SIDE: 'admin',
      ROUTES: 'user-edit,user-create,user-mail,gift-template,plan-add,server-add',
    },
  },
]

const failures = []

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`)
  const r = spawnSync('node', ['scripts/visual-gate/visual-gate.mjs'], {
    cwd: root,
    env: step.env,
    stdio: 'inherit',
  })
  if (r.status !== 0) failures.push(step.name)
}

if (failures.length) {
  console.error('\nVERIFY_PARITY_QUICK_FAILED', failures)
  process.exit(1)
}
console.log('\nVERIFY_PARITY_QUICK_PASS')
