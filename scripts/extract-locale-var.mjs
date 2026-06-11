import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const s = fs.readFileSync(path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'), 'utf8')
const outDir = path.join(root, 'frontend/user/src/i18n/locales')

const map = { BQ: 'ja-JP', DQ: 'ko-KR', NQ: 'vi-VN', HQ: 'zh-TW', LQ: 'fa-IR' }

function extractObject(varName) {
  const patterns = [`var ${varName}=`, `${varName}=`]
  let start = -1
  for (const p of patterns) {
    start = s.indexOf(p)
    if (start >= 0) {
      start = s.indexOf('{', start)
      break
    }
  }
  if (start < 0) return null
  let depth = 0
  let end = start
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  const raw = s.slice(start, end)
  return Function(`"use strict"; return (${raw})`)()
}

for (const [varName, loc] of Object.entries(map)) {
  try {
    const obj = extractObject(varName)
    if (!obj) {
      console.warn('missing var', varName, loc)
      continue
    }
    fs.writeFileSync(path.join(outDir, `${loc}.ts`), `export default ${JSON.stringify(obj, null, 2)} as const\n`)
    console.log('ok', loc, Object.keys(obj).length, 'keys')
  } catch (e) {
    console.warn('fail', loc, e.message)
  }
}
