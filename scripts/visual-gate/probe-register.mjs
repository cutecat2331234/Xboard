import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:7001/#/register', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const info = await p.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')].map((i) => ({
    ph: i.placeholder,
    vis: i.offsetParent !== null,
  }))
  const checkbox = !!document.querySelector('.n-checkbox')
  const cardH = document.querySelector('.n-card')?.getBoundingClientRect().height
  return { inputs, checkbox, cardH }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
