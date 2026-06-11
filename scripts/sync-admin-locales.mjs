#!/usr/bin/env node
/** Copy legacy locale bundles into admin Vite public folder before build. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public/assets/admin/locales')
const dest = path.join(root, 'frontend/admin/public/locales')

if (!fs.existsSync(src)) {
  console.warn('sync-admin-locales: source missing', src)
  process.exit(0)
}

fs.mkdirSync(dest, { recursive: true })
for (const name of fs.readdirSync(src)) {
  if (!name.endsWith('.js')) continue
  fs.copyFileSync(path.join(src, name), path.join(dest, name))
}
console.log('sync-admin-locales: copied', fs.readdirSync(dest).filter((f) => f.endsWith('.js')).join(', '))
