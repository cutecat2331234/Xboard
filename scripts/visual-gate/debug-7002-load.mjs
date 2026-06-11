import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dir, 'output', 'audit-round28-debug')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://43.248.77.134:7002/d7f5c92b#/sign-in', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.evaluate(() => {
  localStorage.setItem('xboard_admin_locale', 'zh-CN')
  localStorage.setItem('i18nextLng', 'zh-CN')
})
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
if ((await page.locator('input[type=password]').count()) > 0) {
  await page.locator('input[type=text],input[type=email]').first().fill('admin@xboard.local')
  await page.locator('input[type=password]').fill('Xboard@2026')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForTimeout(3000)
}
await page.goto('http://43.248.77.134:7002/d7f5c92b#/config/system/safe', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(6000)
const info = await page.evaluate(() => {
  const main = document.querySelector('.flex-1.w-full')
  const rect = main?.getBoundingClientRect()
  return {
    hash: location.hash,
    h3: document.querySelector('h3')?.textContent?.trim(),
    fields: document.querySelectorAll('.xb-stack-2').length,
    mainCls: main?.className,
    mainRect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
    bodyStart: document.body.innerText.slice(0, 200),
    cssLoaded: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href),
    jsLoaded: [...document.querySelectorAll('script[src]')].map((s) => s.src),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: path.join(outDir, 'cmp-full-test.png') })
await page.screenshot({
  path: path.join(outDir, 'cmp-clip-test.png'),
  clip: { x: 256, y: 64, width: 1024, height: 656 },
})
await browser.close()
