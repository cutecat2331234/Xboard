import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const item = document.querySelector('.n-menu-item-content')
    const selected = document.querySelector('.n-menu-item-content--selected')
    const group = document.querySelector('.n-menu-item-group-title')
    const cs = item ? getComputedStyle(item) : null
    const ss = selected ? getComputedStyle(selected) : null
    return {
      item: cs
        ? {
            h: Math.round(item.getBoundingClientRect().height),
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            pad: cs.padding,
            color: cs.color,
            bg: cs.backgroundColor,
          }
        : null,
      selected: ss
        ? { color: ss.color, bg: ss.backgroundColor }
        : null,
      group: group
        ? {
            fontSize: getComputedStyle(group).fontSize,
            color: getComputedStyle(group).color,
            textTransform: getComputedStyle(group).textTransform,
          }
        : null,
      headerH: Math.round(document.querySelector('.app-header, header')?.getBoundingClientRect().height ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
