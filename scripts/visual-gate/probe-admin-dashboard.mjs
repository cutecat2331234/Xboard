import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  await page.waitForTimeout(2000)
}

async function mask(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.recharts-wrapper, .recharts-surface, .recharts-responsive-container').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      }
    })
    document.querySelectorAll('[class*="text-2xl"][class*="font-bold"]').forEach((el) => {
      if (el.closest('.rounded-xl')) el.textContent = '—'
    })
    document.querySelectorAll('.rounded-xl .text-emerald-500, .rounded-xl .text-red-500').forEach((el) => {
      if (el.closest('.rounded-xl')) el.textContent = '—'
    })
    document.querySelectorAll('.rounded-xl svg.lucide-trending-up').forEach((el) => {
      if (el instanceof SVGElement) el.style.opacity = '0'
    })
  })
}

async function collect(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.rounded-xl')].slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        cls: el.className.slice(0, 60),
        h: Math.round(r.height),
        w: Math.round(r.width),
        shadow: getComputedStyle(el).boxShadow.slice(0, 80),
      }
    })
    const aside = document.querySelector('aside')
    const main = document.querySelector('main')
    return {
      asideW: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      mainPad: main ? getComputedStyle(main).padding : null,
      cardCount: document.querySelectorAll('.rounded-xl').length,
      cards,
      h1: document.querySelector('h1')?.textContent?.trim(),
    }
  })
}

async function shot(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  await mask(page)
  const dom = await collect(page)
  const buf = await page.screenshot({ fullPage: false })
  fs.writeFileSync(path.join(__dir, `probe-admin-dash-${tag}.png`), buf)
  await browser.close()
  return { png: PNG.sync.read(buf), dom }
}

const ref = await shot(REF, '7001')
const cmp = await shot(CMP, '7002')
console.log('7001', JSON.stringify(ref.dom, null, 2))
console.log('7002', JSON.stringify(cmp.dom, null, 2))

const [a, b] = [
  [ref.png, cmp.png].map((p) => p),
][0]
const w = Math.min(ref.png.width, cmp.png.width)
const h = Math.min(ref.png.height, cmp.png.height)
const ra = new PNG({ width: w, height: h })
const rb = new PNG({ width: w, height: h })
PNG.bitblt(ref.png, ra, 0, 0, w, h, 0, 0)
PNG.bitblt(cmp.png, rb, 0, 0, w, h, 0, 0)
const diff = new PNG({ width: w, height: h })
const n = pixelmatch(ra.data, rb.data, diff.data, w, h, { threshold: 0.15 })
console.log('full diff%', ((n / (w * h)) * 100).toFixed(3))

const regions = [
  { name: 'aside', x: 0, y: 0, w: 260, h: 900 },
  { name: 'stats', x: 260, y: 60, w: 1020, h: 200 },
  { name: 'overview', x: 260, y: 260, w: 1020, h: 500 },
  { name: 'bottom', x: 260, y: 760, w: 1020, h: 140 },
]
for (const r of regions) {
  const rw = Math.min(r.w, w - r.x)
  const rh = Math.min(r.h, h - r.y)
  const d = new PNG({ width: rw, height: rh })
  const nn = pixelmatch(
    ra.data,
    rb.data,
    d.data,
    rw,
    rh,
    { threshold: 0.15 },
    { width: w, height: h, x: r.x, y: r.y },
  )
  // pixelmatch doesn't support offset in this API - crop instead
  const rc = new PNG({ width: rw, height: rh })
  const cc = new PNG({ width: rw, height: rh })
  PNG.bitblt(ra, rc, r.x, r.y, rw, rh, 0, 0)
  PNG.bitblt(rb, cc, r.x, r.y, rw, rh, 0, 0)
  const dd = new PNG({ width: rw, height: rh })
  const nd = pixelmatch(rc.data, cc.data, dd.data, rw, rh, { threshold: 0.15 })
  console.log(`${r.name} diff%`, ((nd / (rw * rh)) * 100).toFixed(3))
}
