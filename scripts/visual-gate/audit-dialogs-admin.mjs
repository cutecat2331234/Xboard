/**
 * Dialog inventory: 7001 vs 7002 admin (zh-CN). Opens triggers where possible.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SECURE = 'd7f5c92b'

const PAGES = [
  {
    id: 'user',
    hash: '#/user/manage',
    triggers: ['_dropdown_edit_'],
    wait: 'tbody tr',
    async open(page) {
      const row = page.locator('tbody tr').first()
      await row.locator('button').last().click({ timeout: 8000 })
      await page.locator('[role=menuitem]:has-text("编辑")').first().click({ timeout: 8000 })
    },
  },
  {
    id: 'order',
    hash: '#/finance/order',
    triggers: ['button:has-text("分配")', 'button:has-text("详情")'],
    wait: 'tbody tr',
  },
  {
    id: 'server_manage',
    hash: '#/server/manage',
    triggers: ['button:has-text("添加节点")', 'button:has-text("添加")'],
    wait: 'button:has-text("添加")',
  },
  {
    id: 'plugin',
    hash: '#/config/plugin',
    triggers: ['button:has-text("上传插件")', 'button:has-text("上传")'],
    wait: 'button:has-text("上传")',
  },
  {
    id: 'gift-card',
    hash: '#/finance/gift-card',
    triggers: ['button:has-text("模板")', 'button:has-text("生成")'],
    wait: 'button',
  },
  {
    id: 'plan',
    hash: '#/finance/plan',
    triggers: ['button:has-text("添加套餐")', 'button:has-text("添加")'],
    wait: 'button:has-text("添加套餐")',
  },
  {
    id: 'coupon',
    hash: '#/finance/coupon',
    triggers: ['button:has-text("添加优惠券")', 'button:has-text("添加")'],
    wait: 'button:has-text("添加优惠券")',
  },
  {
    id: 'dashboard',
    hash: '#/',
    triggers: [
      '[title*="报错"]',
      '[role=button].text-destructive',
      'span.text-destructive',
      'button.text-destructive',
      'button:has-text("失败")',
    ],
    wait: 'h1',
  },
]

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const onSignIn =
    page.url().includes('sign-in') || (await page.locator('input[type="password"]').count()) > 0
  if (onSignIn) {
    const email = page.locator('input[name="email"], input[type="email"], input[type="text"]').first()
    if ((await email.count()) > 0) {
      await email.waitFor({ state: 'visible', timeout: 30000 })
      await email.fill('admin@xboard.local')
      await page.locator('input[type="password"]').first().fill('Xboard@2026')
      await page.locator('button[type="submit"], form button').last().click()
      await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
    }
  }
  await page.waitForTimeout(2000)
}

async function loginAndSaveState(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  const state = await ctx.storageState()
  await ctx.close()
  return state
}

async function countDialogs(page) {
  return page.evaluate(() => ({
    dialogs: document.querySelectorAll('[role=dialog]').length,
    alertDialogs: document.querySelectorAll('[role=alertdialog]').length,
  }))
}

const browser = await chromium.launch()
const report = []

const refState = await loginAndSaveState(browser, REF)
const cmpState = await loginAndSaveState(browser, CMP)

for (const base of [REF, CMP]) {
  const label = base.includes('7001') ? 'ref' : 'cmp'
  const state = label === 'ref' ? refState : cmpState
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: state })
  const page = await ctx.newPage()

  for (const p of PAGES) {
    await page.goto(`${base}/${SECURE}${p.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector(p.wait, { timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const idle = await countDialogs(page)
    let opened = idle
    let clicked = false
    if (typeof p.open === 'function') {
      try {
        await p.open(page)
        await page.waitForTimeout(1000)
        opened = await countDialogs(page)
        clicked = opened.dialogs > 0
      } catch {
        /* fall through to triggers */
      }
    }
    if (!clicked) {
      for (const trigger of p.triggers) {
        if (trigger.startsWith('_')) continue
        try {
          const btn = page.locator(trigger).first()
          if ((await btn.count()) > 0 && (await btn.isVisible())) {
            await btn.click({ timeout: 8000 })
            await page.waitForTimeout(1000)
            opened = await countDialogs(page)
            if (opened.dialogs > 0) {
              clicked = true
              break
            }
          }
        } catch {
          /* try next trigger */
        }
      }
    }
    report.push({
      page: p.id,
      side: label,
      idleDialogs: idle.dialogs,
      openedDialogs: opened.dialogs,
      clicked,
    })
    if (opened.dialogs > 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
  }
  await ctx.close()
}

await browser.close()
const out = path.join(__dir, 'output', 'audit-dialogs-report.json')
fs.writeFileSync(out, JSON.stringify(report, null, 2))
console.log('Wrote', out)
for (const p of PAGES) {
  const r = report.find((x) => x.page === p.id && x.side === 'ref')
  const c = report.find((x) => x.page === p.id && x.side === 'cmp')
  const gap = r && c && r.openedDialogs !== c.openedDialogs ? `GAP ${r.openedDialogs} vs ${c.openedDialogs}` : 'OK'
  console.log(p.id, gap)
}
