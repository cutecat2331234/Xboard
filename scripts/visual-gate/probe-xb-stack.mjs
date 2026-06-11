import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/subscribe']) {
  console.log(`\n=== ${hash} ===`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    const r = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('.xb-stack-2, .space-y-2')].filter((b) =>
        b.querySelector('label.font-medium, label.text-base'),
      )
      return {
        xb: document.querySelectorAll('.xb-stack-2').length,
        sy: document.querySelectorAll('.space-y-2').length,
        blocks: blocks.slice(0, 4).map((b) => ({
          cls: b.className,
          h: Math.round(b.getBoundingClientRect().height),
          label: b.querySelector('label')?.textContent?.trim().slice(0, 12),
        })),
        cssHref: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).pop(),
        jsHref: [...document.querySelectorAll('script[type=module]')].map((s) => s.src).pop(),
      }
    })
    console.log(name, JSON.stringify(r, null, 2))
    await page.close()
  }
}
await browser.close()
