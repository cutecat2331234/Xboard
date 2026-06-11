import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const email = 'admin@example.com'
const pass = 'your-password'

async function shot(base, route) {
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
  await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  if (route === 'dashboard') {
    await p.waitForFunction(() => {
      const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
      return card && !card.querySelector('.n-skeleton')
    }).catch(() => {})
  }
  await p.mouse.move(8, 8)
  await p.waitForTimeout(500)
  const buf = await p.screenshot()
  await b.close()
  return PNG.sync.read(buf)
}

function cropDiff(a, b, x, y, w, h) {
  const aa = new PNG({ width: w, height: h })
  const bb = new PNG({ width: w, height: h })
  PNG.bitblt(a, aa, x, y, w, h, 0, 0)
  PNG.bitblt(b, bb, x, y, w, h, 0, 0)
  const diff = new PNG({ width: w, height: h })
  const n = pixelmatch(aa.data, bb.data, diff.data, w, h, { threshold: 0.15, includeAA: false })
  return (n / (w * h)) * 100
}

for (const route of ['knowledge', 'dashboard', 'profile', 'invite']) {
  const a = await shot('http://127.0.0.1:7001', route)
  const b = await shot('http://127.0.0.1:7002', route)
  console.log(route, {
    full: cropDiff(a, b, 0, 0, 1280, 900).toFixed(3),
    main: cropDiff(a, b, 236, 60, 1044, 840).toFixed(3),
    sider: cropDiff(a, b, 0, 0, 220, 900).toFixed(3),
    header: cropDiff(a, b, 220, 0, 1060, 60).toFixed(3),
  })
}
