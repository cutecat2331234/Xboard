/** Quick pixel audit for failing config sub-pages only. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = ''
const ROUTES = [
  'config-safe',
  'config-subscribe',
  'config-invite',
  'config-server',
  'config-telegram',
].map((id) => ({
  id,
  hash: `#/config/system/${id.replace('config-', '').replace('subscribe-template', 'subscribe-template')}`,
}))
ROUTES[4].hash = '#/config/system/telegram'
ROUTES[3].hash = '#/config/system/server'
ROUTES[2].hash = '#/config/system/invite'
ROUTES[1].hash = '#/config/system/subscribe'
ROUTES[0].hash = '#/config/system/safe'

const CONFIG_CLIP = { x: 256, y: 64, width: 1024, height: 656 }

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(2000)
}

function diffPct(a, b) {
  const img1 = PNG.sync.read(a)
  const img2 = PNG.sync.read(b)
  const w = Math.min(img1.width, img2.width)
  const h = Math.min(img1.height, img2.height)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(img1.data, img2.data, out.data, w, h, { threshold: 0.1 })
  return { pct: (n / (w * h)) * 100, out }
}

const browser = await chromium.launch()
const report = []
for (const route of ROUTES) {
  const rp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const cp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(rp, REF)
  await login(cp, CMP)
  const url = (b) => `${b}/${SECURE}${route.hash}`
  await rp.goto(url(REF), { waitUntil: 'domcontentloaded' })
  await cp.goto(url(CMP), { waitUntil: 'domcontentloaded' })
  await rp.waitForTimeout(4000)
  await cp.waitForTimeout(4000)
  const mask = () => {
    document.querySelectorAll('input:not([type=hidden]), textarea').forEach((el) => {
      el.value = 'x'
      el.setAttribute('value', 'x')
    })
  }
  await rp.evaluate(mask)
  await cp.evaluate(mask)
  const refBuf = await rp.screenshot({ clip: CONFIG_CLIP })
  const cmpBuf = await cp.screenshot({ clip: CONFIG_CLIP })
  const { pct, out } = diffPct(refBuf, cmpBuf)
  const outDir = path.join(__dir, 'output', 'audit-round28')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, `quick-${route.id}-diff.png`), PNG.sync.write(out))
  report.push({ id: route.id, diffPct: +pct.toFixed(3), pass: pct < 1 })
  await rp.close()
  await cp.close()
  console.log(route.id, pct.toFixed(3) + '%', pct < 1 ? 'PASS' : 'FAIL')
}
await browser.close()
console.log('PASS', report.filter((r) => r.pass).length + '/' + report.length)
