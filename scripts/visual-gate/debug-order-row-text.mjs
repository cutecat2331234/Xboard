import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = ''

async function rows(base) {
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
  await page.waitForSelector('tbody tr td', { timeout: 30000 })
  await page.waitForTimeout(5000)
  const texts = await page.locator('tbody tr').allTextContents()
  const body = await page.locator('tbody').innerText()
  await browser.close()
  return { texts, body: body.slice(0, 500) }
}

const a = await rows('http://127.0.0.1:7001')
const b = await rows('http://127.0.0.1:7002')
console.log('7001 body', a.body)
console.log('7002 body', b.body)
console.log('count', a.texts.length, b.texts.length)
for (let i = 0; i < Math.max(a.texts.length, b.texts.length); i++) {
  if (a.texts[i] !== b.texts[i]) {
    console.log(`row ${i} DIFF`)
    console.log('7001:', a.texts[i])
    console.log('7002:', b.texts[i])
  }
}
