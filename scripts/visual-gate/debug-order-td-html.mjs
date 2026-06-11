import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = 'd7f5c92b'

async function row(base) {
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
    const row = document.querySelector('tbody tr')
    const row2 = document.querySelectorAll('tbody tr')[1]
    const cells = row ? [...row.querySelectorAll('td')].map((td, i) => ({
      i,
      html: td.innerHTML.slice(0, 200),
      color: getComputedStyle(td).color,
      fontSize: getComputedStyle(td).fontSize,
      fontWeight: getComputedStyle(td).fontWeight,
    })) : []
    const cells2 = row2 ? [...row2.querySelectorAll('td')].map((td, i) => ({
      i,
      html: td.innerHTML.slice(0, 120),
    })) : []
    return { cells, cells2, tableWrap: document.querySelector('.overflow-auto.rounded-md')?.className }
  })
  await browser.close()
  return data
}

const a = await row('http://43.248.77.134:7001')
const b = await row('http://43.248.77.134:7002')
for (let i = 0; i < 9; i++) {
  if (JSON.stringify(a.cells[i]) !== JSON.stringify(b.cells[i])) {
    console.log(`cell ${i} DIFF`)
    console.log('7001', a.cells[i])
    console.log('7002', b.cells[i])
  }
}
console.log('row2 status 7001', a.cells2[5])
console.log('row2 status 7002', b.cells2[5])
