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
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/dashboard`)
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const main = document.querySelector('.app-main, .shell-main, .n-layout-content')
    const header = document.querySelector('header, .app-header')
    const brand = document.querySelector('.app-brand, .title-text')
    return {
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      mainY: main ? Math.round(main.getBoundingClientRect().y) : null,
      mainPad: main ? getComputedStyle(main).padding : null,
      brandH: brand ? Math.round(brand.parentElement?.getBoundingClientRect().height ?? 0) : null,
      firstCardY: document.querySelector('.n-card') ? Math.round(document.querySelector('.n-card').getBoundingClientRect().y) : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
