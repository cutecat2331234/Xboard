import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://43.248.77.134:7001/d7f5c92b#/sign-in')
await page.locator('input[type="email"]').first().fill('admin@xboard.local')
await page.locator('input[type="password"]').first().fill('Xboard@2026')
await page.locator('button[type="submit"], form button').last().click()
await page.waitForTimeout(3000)
await page.goto('http://43.248.77.134:7001/d7f5c92b#/finance/order')
await page.waitForTimeout(5000)
const html = await page.evaluate(() => {
  const aside = document.querySelector('aside')
  if (!aside) return 'no aside'
  const versionEl = [...aside.querySelectorAll('*')].find((el) => /v20\d{6}/.test(el.textContent || ''))
  return versionEl ? { outer: versionEl.outerHTML.slice(0, 500), parent: versionEl.parentElement?.outerHTML.slice(0, 800) } : aside.innerHTML.slice(-1500)
})
console.log(JSON.stringify(html, null, 2))
await browser.close()
