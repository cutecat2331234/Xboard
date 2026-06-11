import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = 'd7f5c92b'

async function cells(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(4000)
  await page.goto(`${base}/${securePath}#/finance/order`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await page.waitForTimeout(2000)
  const data = await page.evaluate(() => {
    const row = document.querySelector('tbody tr')
    if (!row) return null
    return [...row.querySelectorAll('td')].map((td, i) => {
      const cs = getComputedStyle(td)
      return {
        i,
        text: td.textContent?.trim().slice(0, 30),
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        bg: cs.backgroundColor,
      }
    })
  })
  await browser.close()
  return data
}

const a = await cells('http://43.248.77.134:7001')
const b = await cells('http://43.248.77.134:7002')
for (let i = 0; i < Math.max(a?.length ?? 0, b?.length ?? 0); i++) {
  const x = a?.[i]
  const y = b?.[i]
  if (JSON.stringify(x) !== JSON.stringify(y)) {
    console.log(`cell ${i} DIFF`)
    console.log('  7001', x)
    console.log('  7002', y)
  }
}
