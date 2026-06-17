import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
  }
}

async function styles(base, label, hash) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3500)
  const info = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        h: Math.round(r.height),
        mt: s.marginTop,
        mb: s.marginBottom,
        gap: s.gap,
        pt: s.paddingTop,
        pb: s.paddingBottom,
        fs: s.fontSize,
        lh: s.lineHeight,
      }
    }
    const fields = document.querySelector('.space-y-4')
    const h3 = document.querySelector('h3')
    const navLink = document.querySelector('nav a.bg-muted, nav a[class*=bg-muted]')
    return {
      h1: pick('h1'),
      h3: pick('h3'),
      sep: pick('[role=none]'),
      outer: pick('.space-y-6'),
      fields: fields ? pick('.space-y-4') : null,
      fieldChild: fields?.firstElementChild ? (() => {
        const s = getComputedStyle(fields.firstElementChild)
        return { mb: s.marginBottom, mt: s.marginTop, gap: s.gap }
      })() : null,
      navActive: navLink ? getComputedStyle(navLink).backgroundColor : null,
      switchField: (() => {
        const sw = document.querySelector('[role=switch]')
        const wrap = sw?.closest('.space-y-2')
        return wrap ? pick('.space-y-2') : null
      })(),
    }
  })
  console.log(label, hash, JSON.stringify(info, null, 2))
  await browser.close()
}

for (const hash of ['#/config/system', '#/config/system/safe', '#/config/system/subscribe']) {
  await styles(REF, '7001', hash)
  await styles(CMP, '7002', hash)
}
