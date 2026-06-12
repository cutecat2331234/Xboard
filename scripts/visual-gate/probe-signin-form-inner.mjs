import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${REF}/d7f5c92b#/sign-in`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
await page.reload({ waitUntil: 'domcontentloaded' })
const info = await page.evaluate(() => {
  const inner = document.querySelector('.rounded-xl form > div')
  if (!inner) return null
  return {
    cls: inner.className,
    h: Math.round(inner.getBoundingClientRect().height),
    kids: [...inner.children].map((el) => ({
      tag: el.tagName,
      cls: el.className.slice(0, 70),
      h: Math.round(el.getBoundingClientRect().height),
    })),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
