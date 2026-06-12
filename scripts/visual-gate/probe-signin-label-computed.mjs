import { chromium } from 'playwright'

const CMP = 'http://43.248.77.134:7002'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`${CMP}/d7f5c92b#/sign-in`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
await page.reload({ waitUntil: 'domcontentloaded' })
const info = await page.evaluate(() => {
  const inner = document.querySelector('.rounded-xl form > div > div.space-y-2')
  const lbl = inner?.querySelector('label')
  const cs = lbl ? getComputedStyle(lbl) : null
  return {
    blockH: inner ? Math.round(inner.getBoundingClientRect().height) : null,
    labelFontSize: cs?.fontSize,
    labelLineHeight: cs?.lineHeight,
    labelClass: lbl?.className,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
