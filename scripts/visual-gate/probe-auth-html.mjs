import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2000)
const html = await p.evaluate(() => {
  const card = document.querySelector('.n-card__content')
  const submit = card?.querySelector('.n-button--primary-type')
  let tail = submit
  const siblings = []
  while (tail?.nextElementSibling) {
    tail = tail.nextElementSibling
    siblings.push({
      tag: tail.tagName,
      cls: tail.className?.slice(0, 80),
      html: tail.outerHTML.slice(0, 300),
    })
  }
  return siblings
})
console.log(JSON.stringify(html, null, 2))
await b.close()
