/**
 * Quick pixel audit for config subpages only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || ''

const ROUTES = [
  { id: 'config-safe', hash: '#/config/system/safe' },
  { id: 'config-subscribe', hash: '#/config/system/subscribe' },
  { id: 'config-invite', hash: '#/config/system/invite' },
  { id: 'config-server', hash: '#/config/system/server' },
  { id: 'config-telegram', hash: '#/config/system/telegram' },
  { id: 'config-site', hash: '#/config/system' },
]

const CONFIG_CLIP = { x: 256, y: 64, width: 1024, height: 656 }

async function login(page, base, attempt = 1) {
  try {
    await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  } catch (e) {
    if (attempt < 3) return login(page, base, attempt + 1)
    throw e
  }
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(1000)
  if ((await page.locator('input[type="password"]').count()) > 0) {
    await page.locator('input[name="email"], input[type="email"], input[type="text"]').first().fill('admin@example.com')
    await page.locator('input[type="password"]').first().fill('your-password')
    await page.locator('button[type="submit"], form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(1500)
}

function diffPct(a, b) {
  const img1 = PNG.sync.read(a)
  const img2 = PNG.sync.read(b)
  const w = Math.min(img1.width, img2.width)
  const h = Math.min(img1.height, img2.height)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(img1.data, img2.data, out.data, w, h, { threshold: 0.1 })
  return (n / (w * h)) * 100
}

async function mask(page) {
  await page.evaluate(() => {
    document.querySelectorAll('input:not([type=hidden]), textarea').forEach((el) => {
      el.value = 'x'
      el.setAttribute('value', 'x')
    })
  })
}

const browser = await chromium.launch()
const ctxRef = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const ctxCmp = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const refPage = await ctxRef.newPage()
const cmpPage = await ctxCmp.newPage()
await login(refPage, REF)
await login(cmpPage, CMP)

const report = []
for (const route of ROUTES) {
  const url = (b) => `${b}/${SECURE}${route.hash}`
  await refPage.goto(url(REF), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await cmpPage.goto(url(CMP), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await refPage.waitForTimeout(4000)
  await cmpPage.waitForTimeout(4000)
  const meta = async (page) =>
    page.evaluate(() => ({
      hash: location.hash,
      h3: document.querySelector('h3')?.textContent?.trim(),
      labels: [...document.querySelectorAll('.space-y-4 > div, .xb-stack-2')].length,
      signIn: location.hash.includes('sign-in'),
    }))
  const refMeta = await meta(refPage)
  const cmpMeta = await meta(cmpPage)
  console.log('  meta', JSON.stringify({ ref: refMeta, cmp: cmpMeta }))
  await mask(refPage)
  await mask(cmpPage)
  const outDir = path.join(__dir, 'output', 'audit-round28-debug')
  fs.mkdirSync(outDir, { recursive: true })
  const refBuf = await refPage.screenshot({ clip: CONFIG_CLIP })
  const cmpBuf = await cmpPage.screenshot({ clip: CONFIG_CLIP })
  fs.writeFileSync(path.join(outDir, `${route.id}-ref.png`), refBuf)
  fs.writeFileSync(path.join(outDir, `${route.id}-cmp.png`), cmpBuf)
  if (route.id === 'config-safe') {
    fs.writeFileSync(path.join(outDir, `${route.id}-cmp-full.png`), await cmpPage.screenshot())
  }
  const pct = diffPct(refBuf, cmpBuf)
  report.push({ id: route.id, diffPct: +pct.toFixed(3), pass: pct < 1 })
  console.log(route.id, pct.toFixed(3) + '%', pct < 1 ? 'PASS' : 'FAIL')
}

await browser.close()
const outPath = path.join(__dir, 'output', 'audit-round28-config.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log('PASS', report.filter((r) => r.pass).length + '/' + report.length)
