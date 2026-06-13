#!/usr/bin/env node
/**
 * Print parity status from parity-suite-report.json.
 *   --smoke  run verify-parity-quick.mjs (~15 min)
 *   --full   run run-parity-suite.mjs (~65 min)
 *   --check  strict validate report (87 parity + 2 cmp-only, all steps pass)
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dir, '../..')
const reportPath = path.join(__dir, 'output', 'parity-suite-report.json')
const smoke = process.argv.includes('--smoke')
const full = process.argv.includes('--full')
const check = process.argv.includes('--check')

const EXPECT_ROUTES = 87
const EXPECT_CMP_ONLY = 2

function validateReport(report) {
  const errors = []
  if (!report?.passed) errors.push('report.passed is not true')
  if (report.totals?.routes !== EXPECT_ROUTES) {
    errors.push(`totals.routes=${report.totals?.routes ?? '?'} expected ${EXPECT_ROUTES}`)
  }
  if (report.totals?.cmpOnly !== EXPECT_CMP_ONLY) {
    errors.push(`totals.cmpOnly=${report.totals?.cmpOnly ?? '?'} expected ${EXPECT_CMP_ONLY}`)
  }
  for (const step of report.steps || []) {
    if (step.status !== 'pass') errors.push(`step ${step.id} status=${step.status}`)
  }
  return errors
}

function readReport() {
  if (!fs.existsSync(reportPath)) {
    console.error('MISSING', reportPath)
    console.error('Run: node scripts/visual-gate/run-parity-suite.mjs')
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  } catch (e) {
    console.error('INVALID JSON', reportPath, e.message)
    return null
  }
}

function printReport(report) {
  console.log('Visual Gate Parity Status')
  console.log('-------------------------')
  console.log('passed:   ', report.passed ? 'YES' : 'NO')
  console.log('timestamp:', report.timestamp)
  if (report.lastSmokeAt) console.log('lastSmoke:', report.lastSmokeAt)
  console.log('ref:      ', report.refBase)
  console.log('cmp:      ', report.cmpBase)
  console.log('routes:   ', report.totals?.routes ?? '?', '/ 87')
  if (report.totals?.cmpOnly != null) {
    console.log('cmp-only: ', report.totals.cmpOnly, '/ 2')
  }
  if (report.steps?.length) {
    for (const s of report.steps) {
      console.log(`  - ${s.name}: ${s.status}`)
    }
  }
  if (report.excluded?.length) {
    console.log('excluded:')
    for (const x of report.excluded) {
      console.log(`  - ${x.id}: ${x.reason}`)
    }
  }
}

function assertParity100(report) {
  const errors = validateReport(report)
  if (errors.length) {
    console.error('\nPARITY_CHECK_FAILED')
    for (const e of errors) console.error(' -', e)
    process.exit(1)
  }
}

if (check) {
  const report = readReport()
  if (!report) process.exit(1)
  printReport(report)
  assertParity100(report)
  console.log('\nPARITY_CHECK_OK (87 parity + 2 cmp-only)')
  process.exit(0)
}

if (full) {
  console.log('Running run-parity-suite.mjs (full, ~65 min) ...')
  const r = spawnSync('node', ['scripts/visual-gate/run-parity-suite.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (r.status !== 0) {
    console.error('\nFULL_SUITE_FAILED')
    process.exit(1)
  }
  const report = readReport()
  if (!report?.passed) process.exit(1)
  assertParity100(report)
  printReport(report)
  console.log('\nPARITY_100_OK (87/87 parity + 2/2 cmp-only, full suite refreshed)')
  process.exit(0)
}

const report = readReport()
if (!report) process.exit(1)

printReport(report)

if (!report.passed) {
  console.error('\nPARITY_NOT_100', report.failures)
  process.exit(1)
}

assertParity100(report)

if (smoke) {
  console.log('\nRunning verify-parity-quick.mjs ...')
  const r = spawnSync('node', ['scripts/visual-gate/verify-parity-quick.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (r.status !== 0) {
    console.error('\nSMOKE_FAILED')
    process.exit(1)
  }
  report.lastSmokeAt = new Date().toISOString()
  report.lastSmokePass = true
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log('\nSMOKE_PASS (updated lastSmokeAt in report)')
}

console.log('\nPARITY_100_OK (87/87 parity + 2/2 cmp-only in last full suite)')
process.exit(0)
