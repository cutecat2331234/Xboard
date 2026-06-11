/**
 * Extract dialog/sheet layout metrics from 7001 vs 7002 for parity tuning.
 */
import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SECURE = 'd7f5c92b'

const SCENARIOS = [
  {
    id: 'user-edit',
    hash: '#/user/manage',
    async open(page) {
      await page.waitForSelector('tbody tr', { timeout: 45000 })
      await page.locator('tbody tr').first().locator('button').last().click({ timeout: 15000 })
      await page.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click({ timeout: 15000 })
      await page.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
  {
    id: 'plan-add',
    hash: '#/finance/plan',
    async open(page) {
      await page.locator('button').filter({ hasText: '添加套餐' }).first().click({ timeout: 15000 })
      await page.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
  {
    id: 'server-add',
    hash: '#/server/manage',
    async open(page) {
      await page.locator('button').filter({ hasText: '添加节点' }).first().click({ timeout: 15000 })
      await page.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
]

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function metrics(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    if (!dlg) return null
    const cs = getComputedStyle(dlg)
    const rect = dlg.getBoundingClientRect()
    const labels = [...dlg.querySelectorAll('label')].map((l) => l.textContent?.trim()).filter(Boolean)
    const title = dlg.querySelector('h2,[data-slot=title]')?.textContent?.trim()
    const buttons = [...dlg.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean)
    const firstInput = dlg.querySelector('input:not([type=hidden])')
    const inputH = firstInput ? getComputedStyle(firstInput).height : null
    const footer = dlg.querySelector('footer') || [...dlg.querySelectorAll('div')].find((d) => {
      const btns = d.querySelectorAll('button')
      return btns.length >= 2 && [...btns].some((b) => /提交|生成|保存|取消/.test(b.textContent || ''))
    })
    const footerRect = footer?.getBoundingClientRect()
    return {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      gap: cs.gap,
      labelCount: labels.length,
      labels: labels.slice(0, 15),
      title,
      buttons: buttons.slice(-6),
      inputHeight: inputH,
      footerTop: footerRect ? Math.round(footerRect.top) : null,
      className: dlg.className.slice(0, 120),
    }
  })
}

for (const sc of SCENARIOS) {
  console.log(`\n### ${sc.id}`)
  for (const [side, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    try {
      await login(page, base)
      await page.goto(`${base}/${SECURE}${sc.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2500)
      await sc.open(page)
      const m = await metrics(page)
      console.log(side, JSON.stringify(m, null, 2))
    } catch (e) {
      console.log(side, 'ERROR', e.message)
    }
    await browser.close()
  }
}
