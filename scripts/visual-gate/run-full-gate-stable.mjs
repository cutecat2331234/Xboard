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

function gateEnv(side) {
  const env = { ...process.env, SIDE: side }
  delete env.ROUTES
  return env
}

function healthOk() {
  for (const base of ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']) {
    try {
      const r = spawnSync(
        'curl.exe',
        ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '15', `${base}/d7f5c92b`],
        { encoding: 'utf8', timeout: 20000 },
      )
      if ((r.stdout || '').trim() !== '200') return false
    } catch {
      return false
    }
  }
  return true
}

function runGate(side, label) {
  for (let i = 1; i <= 3; i++) {
    console.log(`\n=== ${label} attempt ${i} ===`)
    if (!healthOk()) {
      console.log('health check failed, fixing octane...')
      fixOctane()
    }
    const r = spawnSync('node', ['visual-gate.mjs'], {
      cwd: dir,
      env: gateEnv(side),
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

const results = []
function restartDual() {
  spawnSync('python', [path.join(root, 'scripts/ssh-run.py'), 'scripts/restart-dual.sh'], {
    encoding: 'utf8',
    timeout: 180000,
  })
  sleep(15000)
}

for (const round of [1, 2]) {
  console.log(`\n########## FULL GATE ROUND ${round} ##########`)
  restartDual()
  const admin = runGate('admin', `Round ${round} admin`)
  restartDual()
  const user = runGate('user', `Round ${round} user`)
  results.push({ round, admin, user })
}

console.log('\n========== SUMMARY ==========')
for (const { round, admin, user } of results) {
  console.log(`Round ${round}: admin=${admin ? 'PASS' : 'FAIL'} user=${user ? 'PASS' : 'FAIL'}`)
}
const ok = results.every((r) => r.admin && r.user)
process.exit(ok ? 0 : 1)
