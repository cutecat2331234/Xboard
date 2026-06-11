import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function login(page, base) {
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.locator('input[placeholder*="邮箱"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(pass)
  await page.locator('.n-button--primary-type').last().click()
  await page.waitForTimeout(3000)
}

async function probeRoute(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await login(p, base)
  await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  if (route === 'dashboard') {
    await p.waitForFunction(() => {
      const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
      return card && !card.querySelector('.n-skeleton')
    }).catch(() => {})
  }
  const info = await p.evaluate((route) => {
    const pick = (el) => {
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        tag: el.tagName,
        cls: el.className?.toString?.().slice(0, 80),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        color: cs.color,
        pad: cs.padding,
        mar: cs.margin,
        h: Math.round(el.getBoundingClientRect().height),
        w: Math.round(el.getBoundingClientRect().width),
      }
    }
    if (route === 'dashboard') {
      const shortcut = [...document.querySelectorAll('.n-list-item')].find((l) => l.textContent?.includes('教程'))
      const icon = shortcut?.querySelector('svg')
      const title = shortcut?.querySelector('.text-base, .shortcut-title')
      const subCard = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
      return {
        subCardH: Math.round(subCard?.getBoundingClientRect().height ?? 0),
        title: pick(title),
        icon: pick(icon),
        item: pick(shortcut),
        itemCls: shortcut?.className,
      }
    }
    if (route === 'profile') {
      const cards = [...document.querySelectorAll('.n-card')].filter((c) => c.getBoundingClientRect().width > 200)
      return cards.map((c, i) => ({
        i,
        title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
        h: Math.round(c.getBoundingClientRect().height),
        contentPad: getComputedStyle(c.querySelector('.n-card-content, .n-card__content')).padding,
      }))
    }
    if (route === 'invite') {
      const cell = document.querySelector('.n-data-table-tbody td')
      const btn = cell?.querySelector('button')
      const cards = [...document.querySelectorAll('.n-card')].map((c) => Math.round(c.getBoundingClientRect().height))
      return {
        cards,
        cellHtml: cell?.innerHTML?.slice(0, 400),
        btn: pick(btn),
        span: pick(cell?.querySelector('span')),
        row: pick(cell?.closest('tr')),
      }
    }
    return {}
  }, route)
  console.log(base, route, JSON.stringify(info, null, 2))
  await b.close()
}

for (const route of ['dashboard', 'profile', 'invite']) {
  await probeRoute('http://43.248.77.134:7001', route)
  await probeRoute('http://43.248.77.134:7002', route)
}
