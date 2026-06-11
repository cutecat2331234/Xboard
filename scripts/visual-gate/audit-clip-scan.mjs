import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'
const HASH = '#/config/system/safe'

const clips = [
  { name: 'main256', x: 256, y: 0, w: 1024, h: 720 },
  { name: 'form480', x: 480, y: 80, w: 800, h: 640 },
  { name: 'form512', x: 512, y: 100, w: 768, h: 620 },
  { name: 'form560', x: 560, y: 120, w: 720, h: 600 },
]

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
  }
}

const browser = await chromium.launch()
const refCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const cmpCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const refPage = await refCtx.newPage()
const cmpPage = await cmpCtx.newPage()
await login(refPage, REF)
await login(cmpPage, CMP)
await refPage.goto(`${REF}/${SEC}${HASH}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await cmpPage.goto(`${CMP}/${SEC}${HASH}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await refPage.waitForTimeout(3000)
await cmpPage.waitForTimeout(3000)

for (const c of clips) {
  const refBuf = await refPage.screenshot({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } })
  const cmpBuf = await cmpPage.screenshot({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } })
  const a = PNG.sync.read(refBuf)
  const b = PNG.sync.read(cmpBuf)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(a.data, b.data, out.data, w, h, { threshold: 0.1 })
  console.log(c.name, ((n / (w * h)) * 100).toFixed(3) + '%')
}
await browser.close()
