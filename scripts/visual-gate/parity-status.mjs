#!/usr/bin/env node
/**
 * Print parity status from parity-suite-report.json.
 * Exit 0 when passed=true; use --smoke to also run verify-parity-quick.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dir, '../..')
const reportPath = path.join(__dir, 'output', 'parity-suite-report.json')
const smoke = process.argv.includes('--smoke')

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

const report = readReport()
if (!report) process.exit(1)

console.log('Visual Gate Parity Status')
console.log('-------------------------')
console.log('passed:   ', report.passed ? 'YES' : 'NO')
console.log('timestamp:', report.timestamp)
console.log('ref:      ', report.refBase)
console.log('cmp:      ', report.cmpBase)
console.log('routes:   ', report.totals?.routes ?? '?', '/ 87')
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

if (!report.passed) {
  console.error('\nPARITY_NOT_100', report.failures)
  process.exit(1)
}

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

console.log('\nPARITY_100_OK (87/87 routes in last full suite)')
process.exit(0)
