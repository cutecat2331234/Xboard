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
  const info = await p.evaluate(() => {
    const sider = document.querySelector('.n-layout-sider')
    const menu = document.querySelector('.n-menu')
    const brandEl = [...(sider?.querySelectorAll('*') || [])].find((el) => el.childNodes.length === 1 && el.textContent?.trim() === 'Xboard')
    const brandWrap = brandEl?.parentElement
    return {
      menuTop: Math.round(menu?.getBoundingClientRect().top ?? 0),
      brandWrap: brandWrap ? {
        cls: brandWrap.className?.toString?.().slice(0, 80),
        h: Math.round(brandWrap.getBoundingClientRect().height),
        pad: getComputedStyle(brandWrap).padding,
      } : null,
      brandEl: brandEl ? {
        tag: brandEl.tagName,
        cls: brandEl.className?.toString?.().slice(0, 60),
        h: Math.round(brandEl.getBoundingClientRect().height),
        fontSize: getComputedStyle(brandEl).fontSize,
        fontWeight: getComputedStyle(brandEl).fontWeight,
      } : null,
      siderBordered: sider?.classList.contains('n-layout-sider--bordered'),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
