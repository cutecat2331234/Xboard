/**
 * Compare 7001 vs 7002 admin config sub-pages (DOM + pixel diff).
 */
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SECURE = 'd7f5c92b'
const EMAIL = 'admin@xboard.local'
const PASS = 'Xboard@2026'

const CONFIG_ROUTES = [
  { name: 'config-site', hash: '#/config/system' },
  { name: 'config-safe', hash: '#/config/system/safe' },
  { name: 'config-subscribe', hash: '#/config/system/subscribe' },
  { name: 'config-subscribe-template', hash: '#/config/system/subscribe-template' },
  { name: 'config-email', hash: '#/config/system/email' },
]

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  const email = page.locator('input[type="email"], input[name="email"], input').first()
  await email.fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASS)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(2500)
}

async function shot(page, out) {
  const buf = await page.screenshot({ fullPage: false })
  fs.writeFileSync(out, buf)
  return buf
}

function diffPct(a, b) {
  const img1 = PNG.sync.read(a)
  const img2 = PNG.sync.read(b)
  const w = Math.min(img1.width, img2.width)
  const h = Math.min(img1.height, img2.height)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(img1.data, img2.data, out.data, w, h, { threshold: 0.1 })
  return { pct: ((n / (w * h)) * 100).toFixed(3), w, h, n }
}

async function probeRoute(browser, route) {
  const outDir = path.join(__dir, 'output', 'config-probe')
  fs.mkdirSync(outDir, { recursive: true })
  const refPage = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const cmpPage = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(refPage, REF)
  await login(cmpPage, CMP)
  const url = (base) => `${base}/${SECURE}${route.hash}`
  await refPage.goto(url(REF), { waitUntil: 'networkidle', timeout: 90000 })
  await cmpPage.goto(url(CMP), { waitUntil: 'networkidle', timeout: 90000 })
  await refPage.waitForTimeout(2000)
  await cmpPage.waitForTimeout(2000)

  const refMain = await refPage.evaluate(() => {
    const nav = document.querySelectorAll('a[href*="config/system"]')
    const icons = [...document.querySelectorAll('aside svg, nav svg')].slice(0, 8).map((s) => ({
      cls: s.getAttribute('class'),
      paths: s.querySelectorAll('path').length,
    }))
    const h3 = document.querySelector('h3')?.textContent?.trim()
    const textareas = document.querySelectorAll('textarea').length
    const loading = /loading|加载中/i.test(document.body.innerText)
    return { navLinks: nav.length, icons, h3, textareas, loading, title: document.querySelector('h1')?.textContent }
  })
  const cmpMain = await cmpPage.evaluate(() => {
    const nav = document.querySelectorAll('a[href*="config/system"]')
    const icons = [...document.querySelectorAll('aside svg, nav svg')].slice(0, 8).map((s) => ({
      cls: s.getAttribute('class'),
      paths: s.querySelectorAll('path').length,
    }))
    const h3 = document.querySelector('h3')?.textContent?.trim()
    const textareas = document.querySelectorAll('textarea').length
    const loading = /loading|加载中/i.test(document.body.innerText)
    return { navLinks: nav.length, icons, h3, textareas, loading, title: document.querySelector('h1')?.textContent }
  })

  const refBuf = await shot(refPage, path.join(outDir, `${route.name}-ref.png`))
  const cmpBuf = await shot(cmpPage, path.join(outDir, `${route.name}-cmp.png`))
  const { pct } = diffPct(refBuf, cmpBuf)
  await refPage.close()
  await cmpPage.close()
  return { route: route.name, diff: pct, ref: refMain, cmp: cmpMain }
}

const browser = await chromium.launch()
const results = []
for (const r of CONFIG_ROUTES) {
  try {
    results.push(await probeRoute(browser, r))
  } catch (e) {
    results.push({ route: r.name, error: String(e) })
  }
}
await browser.close()
console.log(JSON.stringify(results, null, 2))
