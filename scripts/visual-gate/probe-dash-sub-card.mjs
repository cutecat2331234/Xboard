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
  await p.waitForFunction(() => {
    const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
    return card && !card.querySelector('.n-skeleton')
  }).catch(() => {})
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')]
    const sub = cards.find((c) => c.textContent?.includes('我的订阅'))
    const shortcuts = cards.find((c) => c.textContent?.includes('捷径'))
    const content = sub?.querySelector('.n-card__content, .n-card-content')
    const empty = sub?.querySelector('.cursor-pointer')
    return {
      subH: Math.round(sub?.getBoundingClientRect().height ?? 0),
      subY: Math.round(sub?.getBoundingClientRect().y ?? 0),
      contentPad: content ? getComputedStyle(content).padding : null,
      contentH: Math.round(content?.getBoundingClientRect().height ?? 0),
      emptyH: empty ? Math.round(empty.getBoundingClientRect().height) : null,
      emptyPt: empty ? getComputedStyle(empty).paddingTop : null,
      shortcutsY: Math.round(shortcuts?.getBoundingClientRect().y ?? 0),
      mt5: shortcuts ? getComputedStyle(shortcuts).marginTop : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
