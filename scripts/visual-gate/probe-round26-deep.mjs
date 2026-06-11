/**
 * Round 26 deep DOM compare: 7001 vs 7002 admin config + dashboard + sidebar icons.
 */
import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

const ROUTES = [
  { id: 'dashboard', hash: '#/' },
  { id: 'config-site', hash: '#/config/system' },
  { id: 'config-safe', hash: '#/config/system/safe' },
  { id: 'config-subscribe', hash: '#/config/system/subscribe' },
  { id: 'config-email', hash: '#/config/system/email' },
  { id: 'config-app', hash: '#/config/system/app' },
]

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
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await pwd.first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

function collect() {
  const shellAside = document.querySelector('aside.fixed, aside[class*="w-64"]')
  const tablers = shellAside
    ? [...shellAside.querySelectorAll('.tabler-icon, [class*="tabler-icon"]')].map((el) => el.className)
    : []
  const lucides = shellAside ? [...shellAside.querySelectorAll('.lucide')].map((el) => el.className) : []

  const main = document.querySelector('main') || document.body
  const fields = [...main.querySelectorAll('label.font-medium, label.text-base')].map((l) => {
    const block = l.closest('.space-y-2, .space-y-0\\.5, [class*="space-y"]') || l.parentElement
    const switchEl = block?.querySelector('[role=switch]')
    const input = block?.querySelector('input:not([type=hidden]), textarea, [role=combobox], button[role=combobox]')
    const desc = block?.querySelector('.text-muted-foreground, .text-\\[0\\.8rem\\]')
    const layout =
      switchEl && block?.querySelector('.flex.items-center')
        ? 'switch-row'
        : switchEl
          ? 'switch-below'
          : input
            ? 'input'
            : 'other'
    return {
      label: l.textContent?.trim().slice(0, 40),
      layout,
      descAfter: desc && input ? desc.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING : null,
    }
  })

  const failedBtn = [...document.querySelectorAll('button')].find(
    (b) => b.className.includes('destructive') || /失败|failed/i.test(b.textContent || ''),
  )

  return {
    h1: document.querySelector('h1')?.textContent?.trim(),
    tabs: document.querySelectorAll('[role=tablist] [role=tab]').length,
    asideTabler: tablers.length,
    asideLucide: lucides.length,
    tablerSample: tablers.slice(0, 5),
    lucideSample: lucides,
    fieldCount: fields.length,
    fields: fields.slice(0, 15),
    switchLayouts: [...new Set(fields.filter((f) => f.layout.startsWith('switch')).map((f) => f.layout))],
    failedBtn: failedBtn
      ? { cls: failedBtn.className.slice(0, 80), text: failedBtn.textContent?.trim(), tag: failedBtn.tagName }
      : null,
    destructiveBtns: [...document.querySelectorAll('button.text-destructive, .text-destructive')].map((el) => ({
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 20),
    })),
  }
}

const browser = await chromium.launch()
for (const route of ROUTES) {
  console.log(`\n######## ${route.id} ########`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    try {
      await login(page, base)
      await page.goto(`${base}/${SEC}${route.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      if (route.id === 'config-email') {
        await page.waitForSelector('[role=tablist] [role=tab]', { timeout: 15000 }).catch(() => {})
      }
      await page.waitForTimeout(3500)
      const r = await page.evaluate(collect)
      console.log(name, JSON.stringify(r, null, 2))
    } catch (e) {
      console.log(name, 'ERR', e.message)
    }
    await ctx.close()
  }
}
await browser.close()
