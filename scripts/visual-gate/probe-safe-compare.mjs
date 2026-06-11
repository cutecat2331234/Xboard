import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

async function snap(page, base) {
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(5000)
  return page.evaluate(() => {
    const form = document.querySelector('.flex-1.w-full .gap-4, .flex-1.w-full .space-y-4')
    return {
      formCls: form?.className,
      count: form?.children?.length,
      blocks: [...(form?.children || [])].map((el, i) => ({
        i,
        cls: el.className?.slice(0, 60),
        h: Math.round(el.getBoundingClientRect().height),
        label: el.querySelector('label')?.textContent?.trim()?.slice(0, 30),
        hasSwitch: !!el.querySelector('[role=switch]'),
        hasSelect: !!el.querySelector('[role=combobox],button[role=combobox]'),
        hasInput: !!el.querySelector('input:not([type=hidden])'),
        hasTextarea: !!el.querySelector('textarea'),
      })),
    }
  })
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  const data = await snap(page, base)
  console.log(`\n=== ${name} ===`)
  console.log(JSON.stringify(data, null, 2))
  await page.close()
}
await browser.close()
