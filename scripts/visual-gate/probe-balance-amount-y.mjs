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
  await p.goto(`${base}/#/invite`)
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const card = document.querySelectorAll('.n-card')[0]
    const content = card?.querySelector('.n-card__content, .n-card-content')
    const amount = content?.children[0]
    const span5 = amount?.querySelector('.text-5xl, span')
    const label = content?.children[1]
    const actions = content?.children[2]
    return {
      contentBottom: Math.round(content?.getBoundingClientRect().bottom ?? 0),
      amountY: Math.round(amount?.getBoundingClientRect().y ?? 0),
      amountH: Math.round(amount?.getBoundingClientRect().height ?? 0),
      amountLh: amount ? getComputedStyle(amount).lineHeight : null,
      spanY: Math.round(span5?.getBoundingClientRect().y ?? 0),
      spanH: Math.round(span5?.getBoundingClientRect().height ?? 0),
      labelY: Math.round(label?.getBoundingClientRect().y ?? 0),
      actionsY: Math.round(actions?.getBoundingClientRect().y ?? 0),
      cardBottom: Math.round(card?.getBoundingClientRect().bottom ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
