import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = ''

async function scroll(base) {
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
    const wrap = document.querySelector('.overflow-auto.rounded-md')
    const version = [...document.querySelectorAll('aside *')].find((el) => /^v\d/.test(el.textContent?.trim() || ''))
    return {
      scrollLeft: wrap?.scrollLeft ?? null,
      version: version?.outerHTML ?? null,
      filter0: document.querySelector('button.border-dashed')?.outerHTML,
      addOrder: [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Order'))?.outerHTML,
      perPage: document.querySelector('.flex.items-center.space-x-2')?.innerHTML?.slice(0, 400),
    }
  })
  await browser.close()
  return data
}

console.log('7001', await scroll('http://127.0.0.1:7001'))
console.log('7002', await scroll('http://127.0.0.1:7002'))
