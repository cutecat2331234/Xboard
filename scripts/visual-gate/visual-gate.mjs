#!/usr/bin/env node
/**
 * Pixel diff 7001 (ref) vs 7002 (rewrite). Threshold: core ≤0.5%, others ≤1%.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const refBase = process.env.REF_BASE || 'http://127.0.0.1:7001'
const cmpBase = process.env.CMP_BASE || 'http://127.0.0.1:7002'
const routes = (process.env.ROUTES || 'login,dashboard,plan').split(',')
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'output')

const CORE = new Set(['login', 'dashboard'])

function diffPct(img1, img2) {
  const width = Math.min(img1.width, img2.width)
  const height = Math.min(img1.height, img2.height)
  const a = new PNG({ width, height })
  const b = new PNG({ width, height })
  PNG.bitblt(img1, a, 0, 0, width, height, 0, 0)
  PNG.bitblt(img2, b, 0, 0, width, height, 0, 0)
  const diff = new PNG({ width, height })
  const n = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1, includeAA: true })
  return (n / (width * height)) * 100
}

async function main() {
  const { chromium } = await import('playwright')
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const failures = []

  for (const route of routes) {
    const url = (base) => `${base}/#/${route}`
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const refPage = await ctx.newPage()
    const cmpPage = await ctx.newPage()

    const consoleErrors = []
    cmpPage.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))

    await refPage.goto(url(refBase), { waitUntil: 'networkidle', timeout: 90000 })
    await cmpPage.goto(url(cmpBase), { waitUntil: 'networkidle', timeout: 90000 })
    await refPage.waitForTimeout(1200)
    await cmpPage.waitForTimeout(1200)

    const refPng = PNG.sync.read(await refPage.screenshot({ fullPage: true }))
    const cmpPng = PNG.sync.read(await cmpPage.screenshot({ fullPage: true }))
    const pct = diffPct(refPng, cmpPng)
    const limit = CORE.has(route) ? 0.5 : 1
    const ok = pct <= limit && consoleErrors.length === 0
    const line = `${route}: diff=${pct.toFixed(3)}% limit=${limit}% consoleErrors=${consoleErrors.length} ${ok ? 'PASS' : 'FAIL'}`
    console.log(line)
    if (!ok) failures.push(line)
    await ctx.close()
  }

  await browser.close()
  if (failures.length) {
    console.error('VISUAL_GATE_FAILED', failures)
    process.exit(1)
  }
  console.log('VISUAL_GATE_PASS')
}

main()
