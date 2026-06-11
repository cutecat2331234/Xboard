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
    const list = document.querySelector('.n-list')
    const items = [...document.querySelectorAll('.n-list-item')]
    return {
      listCls: list?.className,
      listH: list ? Math.round(list.getBoundingClientRect().height) : 0,
      items: items.map((li, i) => ({
        i,
        h: Math.round(li.getBoundingClientRect().height),
        y: Math.round(li.getBoundingClientRect().y),
        cls: li.className,
        divider: li.querySelector('.n-list-item__divider')?.getBoundingClientRect(),
      })),
      card: (() => {
        const c = [...document.querySelectorAll('.n-card')].find((x) => x.textContent?.includes('捷径'))
        return {
          h: Math.round(c?.getBoundingClientRect().height ?? 0),
          shadow: c ? getComputedStyle(c).boxShadow : null,
        }
      })(),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
