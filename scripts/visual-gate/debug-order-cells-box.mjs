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
  await page.goto(`${base}/${securePath}#/sign-in`)
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/${securePath}#/finance/order`)
  await page.waitForTimeout(5000)
  const data = await page.evaluate(() => {
    const pick = (el) => {
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const row = document.querySelector('tbody tr')
    const tds = row ? [...row.querySelectorAll('td')].map(pick) : []
    const pag = document.querySelector('.flex.flex-col-reverse.gap-4')
    const pagBtns = pag ? [...pag.querySelectorAll('button')].map((b) => ({ ...pick(b), text: b.textContent?.trim().slice(0, 20) })) : []
    return { tds, pagBtns, pag: pag ? pick(pag) : null }
  })
  await browser.close()
  return data
}

const ref = await cells('http://43.248.77.134:7001')
const cmp = await cells('http://43.248.77.134:7002')
console.log(JSON.stringify({ ref, cmp }, null, 2))
