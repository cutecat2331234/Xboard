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
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
  }
  await page.waitForTimeout(2000)
}

async function probeDashboard(base, label) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3000)
  const before = await page.evaluate(() => ({
    destructive: [...document.querySelectorAll('button.text-destructive')].map((e) => ({
      text: e.textContent?.trim(),
      cls: e.className?.slice(0, 100),
    })),
    failText: [...document.querySelectorAll('button')].filter((b) => /失败|报错/.test(b.textContent || '')).length,
    dialogs: document.querySelectorAll('[role=dialog]').length,
    naiveModal: document.querySelectorAll('.n-modal').length,
    radixDialog: document.querySelectorAll('[data-state=open][role=dialog]').length,
  }))
  const btn = page.locator('button.text-destructive').first()
  if ((await btn.count()) > 0) await btn.click({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const after = await page.evaluate(() => ({
    dialogs: document.querySelectorAll('[role=dialog]').length,
    naiveModal: document.querySelectorAll('.n-modal').length,
    openModals: document.querySelectorAll('.n-modal-body-wrapper, [data-state=open]').length,
    titles: [...document.querySelectorAll('[role=dialog] h2, .n-dialog__title, [class*=DialogTitle]')].map((e) =>
      e.textContent?.trim(),
    ),
  }))
  console.log(label, 'dashboard', JSON.stringify({ before, after }, null, 2))
  await browser.close()
}

async function probeConfig(base, label) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3500)
  const info = await page.evaluate(() => {
    const sw = document.querySelector('[role=switch]')
    const swRect = sw?.getBoundingClientRect()
    const pluginLink = [...document.querySelectorAll('aside a, aside nav a')].find((a) =>
      a.textContent?.includes('插件'),
    )
    const pluginIcon = pluginLink?.querySelector('svg')?.getAttribute('class')
    return {
      asideTabler: document.querySelectorAll('aside .tabler-icon, aside [class*=tabler-icon]').length,
      asideLucide: document.querySelectorAll('aside .lucide').length,
      pluginIcon,
      switch: swRect ? { w: Math.round(swRect.width), h: Math.round(swRect.height) } : null,
      switchParent: sw?.parentElement?.className?.slice(0, 80),
      fieldGap: getComputedStyle(document.querySelector('.space-y-4') || document.body).gap,
      labels: [...document.querySelectorAll('label')].slice(0, 3).map((l) => l.textContent?.trim()),
      combobox: document.querySelectorAll('[role=combobox]').length,
      switches: document.querySelectorAll('[role=switch]').length,
    }
  })
  console.log(label, 'config-safe', JSON.stringify(info, null, 2))
  await browser.close()
}

await probeDashboard(REF, '7001')
await probeDashboard(CMP, '7002')
await probeConfig(REF, '7001')
await probeConfig(CMP, '7002')
