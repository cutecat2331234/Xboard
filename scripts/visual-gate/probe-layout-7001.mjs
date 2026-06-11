import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"], input[type="email"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/dashboard`)
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const content = document.querySelector('.n-layout-content')
    const scroll = document.querySelector('.n-layout-scroll-container')
    const cards = [...document.querySelectorAll('.n-card')].slice(0, 2).map((c) => ({
      y: Math.round(c.getBoundingClientRect().y),
      h: Math.round(c.getBoundingClientRect().height),
    }))
    return {
      contentY: content ? Math.round(content.getBoundingClientRect().y) : null,
      contentPad: content ? getComputedStyle(content).padding : null,
      scrollChildCount: scroll?.children.length,
      cards,
      bodyScroll: document.documentElement.scrollTop,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
