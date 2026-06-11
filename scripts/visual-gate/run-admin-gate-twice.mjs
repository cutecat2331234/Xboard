import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))

function runGate(attempt) {
  for (let i = 1; i <= 3; i++) {
    console.log(`\n=== Round ${attempt}, try ${i} ===`)
    const r = spawnSync('node', ['visual-gate.mjs'], {
      cwd: dir,
      env: { ...process.env, SIDE: 'admin' },
      encoding: 'utf8',
      timeout: 600000,
    })
    process.stdout.write(r.stdout || '')
    process.stderr.write(r.stderr || '')
    if (r.status === 0) return true
    if (i < 3) console.log('retrying after network glitch...')
  }
  return false
}

const r1 = runGate(1)
const r2 = runGate(2)
console.log(`\nSUMMARY: round1=${r1 ? 'PASS' : 'FAIL'} round2=${r2 ? 'PASS' : 'FAIL'}`)
process.exit(r1 && r2 ? 0 : 1)
