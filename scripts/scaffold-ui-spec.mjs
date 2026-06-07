#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tokens = {
  shadow: { card: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12)', authCard: '0 2px 8px rgba(0,0,0,0.15)' },
  colors: { primary: '#2d6565' },
}

const specs = {
  user: ['login', 'register', 'dashboard', 'plan', 'order', 'invite', 'traffic', 'knowledge', 'ticket', 'profile'],
  admin: ['sign-in', 'dashboard', 'config', 'plugin', 'theme', 'notice', 'payment', 'knowledge', 'server_manage', 'server_machine', 'server_group', 'server_route', 'plan', 'order', 'coupon', 'gift-card', 'user', 'ticket', 'traffic-reset'],
}

for (const [side, routes] of Object.entries(specs)) {
  for (const r of routes) {
    const dir = path.join(root, 'decompiled/ui-spec', side, r)
    fs.mkdirSync(dir, { recursive: true })
    const meta = { route: r, side, ref: 'http://127.0.0.1:7001', viewports: [375, 768, 1280] }
    for (const f of ['apis.json', 'computed-styles.json', 'console-errors.json']) {
      const p = path.join(dir, f)
      if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(meta, null, 2))
    }
    const copy = path.join(dir, 'copy.md')
    if (!fs.existsSync(copy)) fs.writeFileSync(copy, `# ${r}\n\nRun \`node scripts/capture-ui-spec.mjs --side=${side}\` after Playwright install.\n`)
    const tok = path.join(dir, 'tokens.json')
    if (!fs.existsSync(tok)) fs.writeFileSync(tok, JSON.stringify(tokens, null, 2))
  }
}
console.log('UI_SPEC_SCAFFOLD_DONE')
