import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

async function pag(base) {
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
    const footer = document.querySelector('.flex.flex-col-reverse.gap-4')
    const nav = footer?.querySelector('.flex.items-center.space-x-2:last-child')
    const btns = nav ? [...nav.querySelectorAll('button')].map((b) => b.outerHTML) : []
    const td = document.querySelector('tbody td')
    const cs = td ? getComputedStyle(td) : null
    const tr = document.querySelector('tbody tr')
    const trCs = tr ? getComputedStyle(tr) : null
    return {
      btns,
      td: td ? { bg: cs.backgroundColor, pad: cs.padding, border: cs.borderBottom, cls: td.className } : null,
      tr: tr ? { bg: trCs.backgroundColor, border: trCs.borderBottom, cls: tr.className } : null,
    }
  })
  await browser.close()
  return data
}

const a = await pag('http://127.0.0.1:7001')
const b = await pag('http://127.0.0.1:7002')
console.log('7001', JSON.stringify(a, null, 2))
console.log('7002', JSON.stringify(b, null, 2))
