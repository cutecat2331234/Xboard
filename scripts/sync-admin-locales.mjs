#!/usr/bin/env node
/** Keep admin locale bundles in sync before build (source: frontend/admin/public/locales). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'frontend/admin/public/locales')
const dest = path.join(root, 'public/assets/admin/locales')

if (!fs.existsSync(src)) {
  console.warn('sync-admin-locales: source missing', src)
  process.exit(0)
}

fs.mkdirSync(dest, { recursive: true })
for (const name of fs.readdirSync(src)) {
  if (!name.endsWith('.js')) continue
  fs.copyFileSync(path.join(src, name), path.join(dest, name))
}
console.log('sync-admin-locales: copied', fs.readdirSync(src).filter((f) => f.endsWith('.js')).join(', '))
