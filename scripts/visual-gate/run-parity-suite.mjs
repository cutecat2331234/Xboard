#!/usr/bin/env node
/**
 * One-shot parity suite: user + admin visual-gate + audit-admin-full + probe-round29.
 * Writes scripts/visual-gate/output/parity-suite-report.json on completion.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dir, '../..')
const outPath = path.join(__dir, 'output', 'parity-suite-report.json')

const env = {
  ...process.env,
  REF_BASE: process.env.REF_BASE || 'http://43.248.77.134:7001',
  CMP_BASE: process.env.CMP_BASE || 'http://43.248.77.134:7002',
  SECURE_PATH: process.env.SECURE_PATH || 'd7f5c92b',
  ADMIN_LOCALE: process.env.ADMIN_LOCALE || 'zh-CN',
}

const steps = [
  {
    id: 'user-gate',
    name: 'visual-gate user (16 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/visual-gate.mjs'],
    env: { ...env, SIDE: 'user' },
    expectRoutes: 16,
  },
  {
    id: 'admin-gate',
    name: 'visual-gate admin (39 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/visual-gate.mjs'],
    env: { ...env, SIDE: 'admin' },
    expectRoutes: 39,
  },
  {
    id: 'audit-full',
    name: 'audit-admin-full (26 routes)',
    cmd: 'node',
    args: ['scripts/visual-gate/audit-admin-full.mjs'],
    env: { ...env },
    expectRoutes: 26,
  },
  {
    id: 'dialogs',
    name: 'probe-round29 dialogs (6 scenarios)',
    cmd: 'node',
    args: ['scripts/visual-gate/probe-round29-dialogs.mjs'],
    env: { ...env },
    expectRoutes: 6,
  },
]

const EXCLUDED = [
  { id: 'gift-generate', reason: '7001 template rows have Edit/Delete only, no inline Generate' },
  { id: 'user-gift-card', reason: '7001 legacy has no user gift-card page (use INCLUDE_GIFT_CARD=1 for cmp-only)' },
]

const report = {
  passed: false,
  timestamp: new Date().toISOString(),
  refBase: env.REF_BASE,
  cmpBase: env.CMP_BASE,
  steps: [],
  totals: { routes: 0, steps: steps.length },
  excluded: EXCLUDED,
}

const failures = []

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`)
  const started = Date.now()
  const r = spawnSync(step.cmd, step.args, { cwd: root, env: step.env, stdio: 'inherit' })
  const ok = r.status === 0
  if (!ok) failures.push(step.name)
  report.steps.push({
    id: step.id,
    name: step.name,
    status: ok ? 'pass' : 'fail',
    expectRoutes: step.expectRoutes,
    durationMs: Date.now() - started,
  })
  if (ok) report.totals.routes += step.expectRoutes
}

report.passed = failures.length === 0
report.failures = failures

const auditReportPath = path.join(__dir, 'output', 'audit-round29-report.json')
if (fs.existsSync(auditReportPath)) {
  try {
    const audit = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'))
    report.auditFailCount = Array.isArray(audit)
      ? audit.filter((x) => x && x.pass === false).length
      : audit.failCount
  } catch {
    /* optional enrichment */
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log(`\nWrote ${outPath}`)

if (failures.length) {
  console.error('\nPARITY_SUITE_FAILED', failures)
  process.exit(1)
}
console.log('\nPARITY_SUITE_PASS user+admin+audit+dialogs (87 routes)')
