import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

async function probe(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(4000)
  await page.goto(`${base}/${securePath}#/finance/order`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
  await page.waitForTimeout(2000)
  const data = await page.evaluate(() => {
    const td = document.querySelector('tbody td')
    const tr = document.querySelector('tbody tr')
    const cs = (el) =>
      el
        ? {
            cls: el.className,
            pad: getComputedStyle(el).padding,
            h: el.getBoundingClientRect().height,
            borderBottom: getComputedStyle(el).borderBottom,
          }
        : null
    return {
      rowCount: document.querySelectorAll('tbody tr').length,
      td: cs(td),
      tr: cs(tr),
      pagBtn: document.querySelector('.flex.flex-col-reverse.gap-4 button.inline-flex')?.className,
    }
  })
  await browser.close()
  return data
}

console.log('7001', await probe('http://127.0.0.1:7001'))
console.log('7002', await probe('http://127.0.0.1:7002'))
