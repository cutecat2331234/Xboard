import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

async function inspect(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/#/dashboard`)
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, padding: s.padding }
    }
    const alert = document.querySelector('.n-alert')
    const subCard = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
    const shortCard = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('捷径'))
    const firstShortcut = document.querySelector('.n-list-item')
    return { alert: pick(alert), subCard: pick(subCard), shortCard: pick(shortCard), firstShortcut: pick(firstShortcut) }
  })
  fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), `dash-style-${tag}.json`), JSON.stringify(data, null, 2))
  console.log(tag, JSON.stringify(data))
  await browser.close()
}

await inspect('http://43.248.77.134:7001', '7001')
await inspect('http://43.248.77.134:7002', '7002')
