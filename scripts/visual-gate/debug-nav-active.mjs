import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = 'd7f5c92b'

async function nav(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`)
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/${securePath}#/finance/order`)
  await page.waitForTimeout(5000)
  const data = await page.evaluate(() => {
    const active = document.querySelector('aside a[aria-current="page"], aside a.bg-secondary, aside a.active')
      || [...document.querySelectorAll('aside a')].find((a) => a.textContent?.includes('Order Management'))
    if (!active) return 'no active'
    const cs = getComputedStyle(active)
    return { cls: active.className, bg: cs.backgroundColor, color: cs.color, outer: active.outerHTML.slice(0, 300) }
  })
  await browser.close()
  return data
}

console.log('7001', await nav('http://43.248.77.134:7001'))
console.log('7002', await nav('http://43.248.77.134:7002'))
