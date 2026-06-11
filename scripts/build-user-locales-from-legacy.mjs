#!/usr/bin/env node
/** Build nested locale TS files from legacy vue-i18n default maps + zh-CN bridge. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'frontend/user/src/i18n/locales')

function loadTsModule(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^export default /, '').replace(/ as const\n?$/, '')
  return Function(`"use strict"; return (${raw})`)()
}

const zhCN = loadTsModule(path.join(localeDir, 'zh-CN.ts'))
const enUS = loadTsModule(path.join(localeDir, 'en-US.ts'))

function walkLeaves(obj, prefix = []) {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const p = [...prefix, k]
    if (v && typeof v === 'object') out.push(...walkLeaves(v, p))
    else out.push({ path: p, zh: String(v) })
  }
  return out
}

const leaves = walkLeaves(zhCN)

function buildNested(paths, value) {
  const [head, ...rest] = paths
  if (!rest.length) return { [head]: value }
  return { [head]: buildNested(rest, value) }
}

function deepMerge(a, b) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
      out[k] = deepMerge(out[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

for (const loc of ['ja-JP', 'ko-KR', 'vi-VN', 'zh-TW', 'fa-IR']) {
  const legacyPath = path.join(localeDir, `${loc}.ts`)
  if (!fs.existsSync(legacyPath)) continue
  const legacy = loadTsModule(legacyPath)
  const map = legacy.default ?? legacy
  let nested = {}
  for (const { path: p, zh } of leaves) {
    const translated = map[zh] ?? map[zh.replace(/（/g, '(').replace(/）/g, ')')]
    const enLeaf = p.reduce((cur, key) => cur?.[key], enUS)
    const value = translated ?? enLeaf ?? zh
    nested = deepMerge(nested, buildNested(p, value))
  }
  fs.writeFileSync(legacyPath, `export default ${JSON.stringify(nested, null, 2)} as const\n`)
  console.log('built', loc)
}
