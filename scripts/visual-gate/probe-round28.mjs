import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

const PAGES = [
  '#/config/system/safe',
  '#/config/system/subscribe',
  '#/config/system/invite',
  '#/config/system/server',
  '#/config/system/telegram',
]

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

function probe() {
  return (page) =>
    page.evaluate(() => {
      const main = document.querySelector('.flex-1.w-full') || document.querySelector('main')
      const formArea = main?.querySelector('.gap-4, .space-y-4')
      const outer = formArea?.parentElement
      const fields = [...(formArea?.children || [])].map((el, i) => {
        const label = el.querySelector('label')?.textContent?.trim().slice(0, 20)
        const rect = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          i,
          label,
          tag: el.tagName,
          cls: el.className?.slice?.(0, 80),
          h: Math.round(rect.height),
          gap: cs.gap,
          rowGap: cs.rowGap,
          display: cs.display,
          childCount: el.children.length,
        }
      })
      const totalH = formArea ? Math.round(formArea.getBoundingClientRect().height) : 0
      return {
        outerCls: outer?.className?.slice(0, 80),
        formCls: formArea?.className?.slice(0, 80),
        fieldCount: fields.length,
        totalFormH: totalH,
        fields: fields.slice(0, 12),
        lastFields: fields.slice(-3),
      }
    })
}

const browser = await chromium.launch()
for (const hash of PAGES) {
  console.log(`\n######## ${hash} ########`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    const data = await probe()(page)
    console.log(name, JSON.stringify(data, null, 2))
    await page.close()
  }
}
await browser.close()
