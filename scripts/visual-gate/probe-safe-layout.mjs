import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function layout(page, base) {
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(4000)
  return page.evaluate(() => {
    const els = {
      h1: document.querySelector('h1'),
      h3: document.querySelector('h3.text-lg'),
      form: document.querySelector('.gap-4,.space-y-4'),
      sep: document.querySelector('.flex-1.w-full .bg-border'),
    }
    const r = (el) => el && { y: Math.round(el.getBoundingClientRect().y), h: Math.round(el.getBoundingClientRect().height), cls: el.className?.slice(0, 60) }
    return Object.fromEntries(Object.entries(els).map(([k, el]) => [k, r(el)]))
  })
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  console.log(name, await layout(page, base))
  await page.close()
}
await browser.close()
