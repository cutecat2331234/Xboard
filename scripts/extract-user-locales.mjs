#!/usr/bin/env node
/** Extract user locale JSON embedded in legacy umi.js. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const umi = fs.readFileSync(path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'), 'utf8')
const outDir = path.join(root, 'frontend/user/src/i18n/locales')
fs.mkdirSync(outDir, { recursive: true })

const locales = ['ja-JP', 'ko-KR', 'vi-VN', 'zh-TW', 'fa-IR']

function extractLocale(loc) {
  const marker = `"./lang/${loc}.json":()=>Zl((()=>Promise.resolve(`
  const start = umi.indexOf(marker)
  if (start < 0) return null
  let i = start + marker.length
  if (umi[i] !== '{') return null
  let depth = 0
  let end = i
  for (; i < umi.length; i++) {
    const ch = umi[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  const raw = umi.slice(start + marker.length, end)
  return JSON.parse(raw)
}

for (const loc of locales) {
  try {
    const obj = extractLocale(loc)
    if (!obj) {
      console.warn('missing', loc)
      continue
    }
    const tsPath = path.join(outDir, `${loc}.ts`)
    fs.writeFileSync(tsPath, `export default ${JSON.stringify(obj, null, 2)} as const\n`)
    console.log('ok', loc, '->', path.basename(tsPath))
  } catch (e) {
    console.warn('fail', loc, e.message)
  }
}
