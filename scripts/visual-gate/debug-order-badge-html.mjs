import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = ''

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.setItem('i18nextLng', 'en-US')
})
await page.goto(`http://127.0.0.1:7001/${securePath}#/sign-in`)
await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
await page.locator('input[type="password"]').first().fill('your-password')
await page.locator('button[type="submit"], form button').last().click()
await page.waitForTimeout(3000)
await page.goto(`http://127.0.0.1:7001/${securePath}#/finance/order`)
await page.waitForTimeout(5000)
const html = await page.evaluate(() => {
  const row = document.querySelector('tbody tr')
  return row ? [...row.querySelectorAll('td')].map((td) => td.innerHTML) : []
})
await browser.close()
html.forEach((h, i) => console.log(`cell ${i}:`, h))
