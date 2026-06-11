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
  await page.waitForTimeout(1500)
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

function iconAudit() {
  const shell = document.querySelector('aside.fixed, aside[class*="w-64"]')
  const items = shell
    ? [...shell.querySelectorAll('svg, .lucide')].map((el) => ({
        tag: el.tagName,
        cls: (el.getAttribute('class') || '').slice(0, 80),
        parent: el.closest('a,button')?.textContent?.trim().slice(0, 20),
      }))
    : []
  return { count: items.length, items }
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/config/system/email`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(5000)
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300))
  const icons = await page.evaluate(iconAudit)
  console.log(`\n=== ${name} email ===`)
  console.log('body:', body)
  console.log('icons', icons.count)
  console.log('errors', errors.slice(0, 5))
  await ctx.close()
}

// sidebar on config
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}#/config/system`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3000)
  const r = await page.evaluate(() => {
    const shell = document.querySelector('aside.fixed, aside[class*="w-64"]')
    const tablers = shell ? [...shell.querySelectorAll('.tabler-icon, [class*="tabler-icon"]')] : []
    const lucides = shell ? [...shell.querySelectorAll('.lucide')] : []
    const configAside = document.querySelector('aside.sticky, aside.lg\\:w-1\\/5')
    const configIcons = configAside ? [...configAside.querySelectorAll('.tabler-icon')] : []
    return {
      shellTabler: tablers.map((el) => el.className.baseVal || el.className),
      shellLucide: lucides.map((el) => el.className.baseVal || el.className),
      configTabler: configIcons.length,
    }
  })
  console.log(`\n=== ${name} config sidebar icons ===`)
  console.log(JSON.stringify(r, null, 2))
  await ctx.close()
}
await browser.close()
