import { chromium } from 'playwright'

const bases = [
  ['7001', 'http://43.248.77.134:7001'],
  ['7002', 'http://43.248.77.134:7002'],
]
const SECURE = 'd7f5c92b'

for (const [name, base] of bases) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return {
      primary: s.getPropertyValue('--color-primary').trim() || s.getPropertyValue('--primary').trim(),
      bg: s.backgroundColor,
    }
  })
  const btn = await page.evaluate(() => {
    const b = document.querySelector('button[type=submit]')
    if (!b) return null
    const cs = getComputedStyle(b)
    return { bg: cs.backgroundColor, color: cs.color }
  })
  console.log(name, { vars, submitBtn: btn })
  await browser.close()
}
