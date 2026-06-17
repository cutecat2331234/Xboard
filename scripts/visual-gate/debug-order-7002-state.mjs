import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(e.message))

await page.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.setItem('i18nextLng', 'en-US')
})
for (let i = 0; i < 3; i++) {
  try {
    await page.goto(`http://127.0.0.1:7002/${securePath}#/sign-in`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com', { timeout: 30000 })
    break
  } catch {
    await page.waitForTimeout(3000)
  }
}
await page.locator('input[type="password"]').first().fill('your-password')
await page.locator('button[type="submit"], form button').last().click()
await page.waitForTimeout(4000)
await page.goto(`http://127.0.0.1:7002/${securePath}#/finance/order`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('table tbody tr', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(3000)

const info = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  bodyText: document.body.innerText.slice(0, 800),
  hasTable: !!document.querySelector('table'),
  hasLoading: document.body.innerText.includes('Loading'),
  thCount: document.querySelectorAll('thead th').length,
}))

console.log(JSON.stringify({ info, errors }, null, 2))
await browser.close()
