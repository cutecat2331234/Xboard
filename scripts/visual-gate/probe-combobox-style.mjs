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

async function probe(base, label) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}#/config/system/subscribe`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3500)
  const info = await page.evaluate(() =>
    [...document.querySelectorAll('[role=combobox]')].map((el, i) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return {
        i,
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        fs: s.fontSize,
        br: s.borderRadius,
        cls: el.className?.slice(0, 80),
      }
    }),
  )
  console.log(label, JSON.stringify(info))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
