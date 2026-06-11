import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../..')

function sleep(ms) {
  spawnSync('node', ['-e', `setTimeout(() => process.exit(0), ${ms})`], { timeout: ms + 5000 })
}

function fixOctane() {
  spawnSync('python', [path.join(root, 'scripts/_fix_octane.py')], {
    encoding: 'utf8',
    timeout: 120000,
  })
  sleep(12000)
}

function gateEnv() {
  const env = { ...process.env, SIDE: 'admin' }
  delete env.ROUTES
  return env
}

function healthOk() {
  for (const base of ['http://127.0.0.1:7001', 'http://127.0.0.1:7002']) {
    try {
      const r = spawnSync(
        'curl.exe',
        ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '15', `${base}/`],
        { encoding: 'utf8', timeout: 20000 },
      )
      if ((r.stdout || '').trim() !== '200') return false
    } catch {
      return false
    }
  }
  return true
}

function runGate(label) {
  for (let i = 1; i <= 3; i++) {
    console.log(`\n=== ${label} attempt ${i} ===`)
    if (!healthOk()) {
      console.log('health check failed, fixing octane...')
      fixOctane()
    }
    const r = spawnSync('node', ['visual-gate.mjs'], {
      cwd: dir,
      env: gateEnv(),
      encoding: 'utf8',
      timeout: 900000,
    })
    process.stdout.write(r.stdout || '')
    process.stderr.write(r.stderr || '')
    if (r.status === 0) return true
    if (i < 3) {
      console.log('gate failed, stabilizing...')
      fixOctane()
    }
  }
  return false
}

function restartDual() {
  spawnSync('python', [path.join(root, 'scripts/ssh-run.py'), 'scripts/restart-dual.sh'], {
    encoding: 'utf8',
    timeout: 180000,
  })
  sleep(15000)
}

restartDual()
const r1 = runGate('Round 1')
restartDual()
const r2 = runGate('Round 2')
console.log(`\nSUMMARY: round1=${r1 ? 'PASS' : 'FAIL'} round2=${r2 ? 'PASS' : 'FAIL'}`)
process.exit(r1 && r2 ? 0 : 1)
