import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

async function measure(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`)
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/${securePath}#/finance/order`)
  await page.waitForTimeout(5000)

  const data = await page.evaluate(() => {
    const pick = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        text: (el.textContent || '').trim().slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        pad: cs.padding,
        fontSize: cs.fontSize,
      }
    }
    const ths = [...document.querySelectorAll('thead th')].map(pick)
    const firstRow = document.querySelector('tbody tr')
    const tds = firstRow ? [...firstRow.querySelectorAll('td')].map(pick) : []
    const toolbar = [...document.querySelectorAll('button, input')].filter((el) => {
      const y = el.getBoundingClientRect().y
      return y > 60 && y < 220
    }).map(pick)
    const pagination = document.querySelector('.flex.flex-col-reverse.gap-4') || document.querySelector('[class*="pagination"]')
    return {
      ths,
      tds,
      toolbar: toolbar.slice(0, 12),
      pagination: pagination ? pick(pagination) : null,
      table: document.querySelector('table') ? pick(document.querySelector('table')) : null,
    }
  })
  await browser.close()
  return data
}

const ref = await measure('http://127.0.0.1:7001')
const cmp = await measure('http://127.0.0.1:7002')
console.log(JSON.stringify({ ref, cmp }, null, 2))
