#!/usr/bin/env node
/** Merge missing `errors.*` keys from en-US into secondary user locales (English fallback). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'frontend/user/src/i18n/locales')

function extractErrorsBlock(content) {
  const start = content.indexOf('errors: {')
  if (start === -1) return null
  let depth = 0
  let i = content.indexOf('{', start)
  const begin = i
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) {
        return { block: content.slice(begin + 1, i), full: content.slice(start, i + 1) }
      }
    }
  }
  return null
}

function parseErrorEntries(block) {
  const entries = new Map()
  const re = /^\s+(\w+):\s*(['"`])((?:\\.|(?!\2).)*)\2/mg
  let m
  while ((m = re.exec(block)) !== null) {
    entries.set(m[1], m[0].trim())
  }
  return entries
}

const enContent = fs.readFileSync(path.join(localeDir, 'en-US.ts'), 'utf8')
const enErrors = extractErrorsBlock(enContent)
if (!enErrors) {
  console.error('en-US errors block not found')
  process.exit(1)
}
const enEntries = parseErrorEntries(enErrors.block)

for (const file of fs.readdirSync(localeDir)) {
  if (!file.endsWith('.ts') || file === 'en-US.ts' || file === 'index.ts') continue
  const filePath = path.join(localeDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  const local = extractErrorsBlock(content)
  if (!local) {
    console.warn('skip (no errors block):', file)
    continue
  }
  const localEntries = parseErrorEntries(local.block)
  const missing = [...enEntries.keys()].filter((k) => !localEntries.has(k))
  if (missing.length === 0) {
    console.log(file, 'ok')
    continue
  }
  const insertLines = missing.map((k) => '    ' + enEntries.get(k)).join(',\n')
  const closingIdx = content.indexOf(local.full) + local.full.lastIndexOf('}')
  const before = content.slice(0, closingIdx)
  const after = content.slice(closingIdx)
  const needsComma = !before.trimEnd().endsWith(',')
  content = before + (needsComma ? ',' : '') + '\n' + insertLines + '\n' + after
  fs.writeFileSync(filePath, content)
  console.log(file, 'added', missing.length, 'keys')
}
