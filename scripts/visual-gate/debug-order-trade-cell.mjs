import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = 'd7f5c92b'

async function cellHtml(base, tag) {
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
    const rows = [...document.querySelectorAll('tbody tr')]
    const row = rows[0]
    const row2 = rows[1]
    const cells = row ? [...row.querySelectorAll('td')] : []
    const cells2 = row2 ? [...row2.querySelectorAll('td')] : []
    return {
      trade: cells[0]?.innerHTML,
      status: cells[5]?.innerHTML,
      trade2: cells2[0]?.innerHTML?.slice(0, 300),
      headerStatus: document.querySelector('thead th:nth-child(6)')?.innerHTML,
      filter0: document.querySelector('button.border-dashed')?.outerHTML?.slice(0, 500),
    }
  })
  await browser.close()
  console.log(tag, JSON.stringify(data, null, 2))
}

await cellHtml('http://43.248.77.134:7001', '7001')
await cellHtml('http://43.248.77.134:7002', '7002')
