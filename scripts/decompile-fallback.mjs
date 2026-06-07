#!/usr/bin/env node
/** Regex extract routes/API hints when webcrack cannot run (e.g. Windows without VS). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function extract(file, outDir, label) {
  const text = fs.readFileSync(file, 'utf8')
  const routes = [...new Set(text.match(/#\/?[a-z][a-z0-9-/_]*/gi) ?? [])].sort()
  const apis = [...new Set(text.match(/\/api\/v[12]\/[a-z0-9_./-]+/gi) ?? [])].sort()
  const keys = [...new Set(text.match(/"[a-z][a-zA-Z0-9_.]{2,40}"/g) ?? [])]
    .map((s) => s.slice(1, -1))
    .filter((k) => k.includes('.') || k.length > 8)
    .slice(0, 500)

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'routes.json'), JSON.stringify(routes, null, 2))
  fs.writeFileSync(path.join(outDir, 'apis-grep.json'), JSON.stringify(apis, null, 2))
  fs.writeFileSync(path.join(outDir, 'strings-sample.json'), JSON.stringify(keys, null, 2))
  fs.writeFileSync(
    path.join(outDir, 'README.md'),
    `# ${label} decompile fallback\n\nSource: \`${path.relative(root, file)}\`\n\nwebcrack failed on this host; use \`node scripts/decompile-frontends.mjs\` on Linux with NODE_OPTIONS=8192.\n`,
  )
  console.log(label, 'routes', routes.length, 'apis', apis.length)
}

extract(
  path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'),
  path.join(root, 'decompiled/user'),
  'user',
)
extract(
  path.join(root, 'legacy-dist/public/assets/admin/assets/index-BdbgNvrf.js'),
  path.join(root, 'decompiled/admin'),
  'admin',
)
