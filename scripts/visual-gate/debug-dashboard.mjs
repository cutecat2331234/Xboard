import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const out = path.dirname(fileURLToPath(import.meta.url))
const BOX = { x: 236, y: 60, width: 1044, height: 840 }

async function shot(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.goto(`${base}/#/dashboard`)
  await page.waitForTimeout(4000)
  const text = await page.locator('body').innerText()
  const alerts = await page.evaluate(() =>
    [...document.querySelectorAll('.n-alert, .n-carousel, .dash-promo-card')].map((el) => ({
      cls: el.className?.slice?.(0, 80),
      text: el.textContent?.slice(0, 120),
      h: el.getBoundingClientRect().height,
    })),
  )
  fs.writeFileSync(path.join(out, `debug-dash-${tag}.txt`), text)
  fs.writeFileSync(path.join(out, `debug-dash-${tag}.json`), JSON.stringify(alerts, null, 2))
  const buf = await page.screenshot({ clip: BOX })
  fs.writeFileSync(path.join(out, `debug-dash-${tag}.png`), buf)
  await browser.close()
  return PNG.sync.read(buf)
}

const ref = await shot('http://127.0.0.1:7001', '7001')
const cmp = await shot('http://127.0.0.1:7002', '7002')
const diff = new PNG({ width: ref.width, height: ref.height })
const n = pixelmatch(ref.data, cmp.data, diff.data, ref.width, ref.height, { threshold: 0.1 })
console.log('diff%', ((n / (ref.width * ref.height)) * 100).toFixed(3))
fs.writeFileSync(path.join(out, 'debug-dash-diff.png'), PNG.sync.write(diff))
