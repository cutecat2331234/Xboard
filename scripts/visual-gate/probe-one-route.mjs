/** One-off pixel diff for custom admin hash path */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const hash = process.argv[2] || '#/config/system/subscribe-template'
const name = process.argv[3] || 'subscribe-template'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SECURE = 'd7f5c92b'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    return await import('playwright-core')
  }
}

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(1000)
  if (!page.url().includes('sign-in')) return
  const email = page.locator('input[name="email"], input[type="email"], input[type="text"]')
  if ((await email.count()) === 0) return
  await email.first().fill('admin@xboard.local')
  await page.locator('input[name="password"], input[type="password"]').first().fill('Xboard@2026')
  const submit = page.locator('button[type="submit"], form button').last()
  if ((await submit.count()) > 0) await submit.click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch()
const outDir = path.join(__dir, 'output', 'config-probe')
fs.mkdirSync(outDir, { recursive: true })

for (const [label, base] of [['ref', REF], ['cmp', CMP]]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  await page.goto(`${base}/${SECURE}${hash}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const meta = await page.evaluate(() => ({
    h3: document.querySelector('h3')?.textContent?.trim(),
    textareas: document.querySelectorAll('textarea').length,
    loading: /加载中|loading/i.test(document.body.innerText),
    asideLucide: document.querySelectorAll('aside .lucide').length,
    asideTabler: document.querySelectorAll('aside .tabler-icon, aside [class*="tabler"]').length,
    configNavLinks: document.querySelectorAll('a[href*="config/system"]').length,
  }))
  console.log(label, meta)
  await page.screenshot({ path: path.join(outDir, `${name}-${label}.png`) })
  await page.close()
}

const ref = PNG.sync.read(fs.readFileSync(path.join(outDir, `${name}-ref.png`)))
const cmp = PNG.sync.read(fs.readFileSync(path.join(outDir, `${name}-cmp.png`)))
const w = Math.min(ref.width, cmp.width)
const h = Math.min(ref.height, cmp.height)
const diff = new PNG({ width: w, height: h })
const n = pixelmatch(ref.data, cmp.data, diff.data, w, h, { threshold: 0.1 })
fs.writeFileSync(path.join(outDir, `${name}-diff.png`), PNG.sync.write(diff))
console.log('diff%', ((n / (w * h)) * 100).toFixed(3))
await browser.close()
