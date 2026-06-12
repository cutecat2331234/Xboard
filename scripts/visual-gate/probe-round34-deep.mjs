/**
 * Deep structural compare: plan-add, server-add, user-edit suffix fields.
 */
import { chromium } from 'playwright'

const REF = process.env.VG_REF || 'http://127.0.0.1:7001'
const CMP = process.env.VG_CMP || 'http://127.0.0.1:7002'
const SECURE = process.env.VG_SECURE || ''

async function login(page, base, n = 1) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input#email,input[type=email]').first().fill('admin@example.com', { timeout: 20000 })
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3500)
  } else if (n < 3) {
    return login(page, base, n + 1)
  }
}

async function measureDialog(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    if (!dlg) return null
    const r = dlg.getBoundingClientRect()
    const sections = [...dlg.querySelectorAll(':scope > div')].map((el, i) => {
      const b = el.getBoundingClientRect()
      return { i, h: Math.round(b.height), cls: el.className.slice(0, 60) }
    })
    const textarea = dlg.querySelector('textarea')
    const taH = textarea ? Math.round(textarea.getBoundingClientRect().height) : null
    const suffixSpans = [...dlg.querySelectorAll('span')].filter((s) => {
      const t = s.textContent?.trim()
      return t === '¥' || t === 'GB' || t === 'x'
    }).length
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      scrollH: dlg.scrollHeight,
      sections,
      textareaH: taH,
      suffixSpans,
      labelCount: dlg.querySelectorAll('label').length,
    }
  })
}

const SCENARIOS = [
  {
    id: 'plan-add',
    hash: '#/finance/plan',
    async open(p) {
      await p.locator('button').filter({ hasText: /添加套餐|添加/ }).first().click({ timeout: 15000 })
      await p.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
  {
    id: 'server-add',
    hash: '#/server/manage',
    async open(p) {
      await p.locator('button').filter({ hasText: /添加服务器|添加节点|添加/ }).first().click({ timeout: 15000 })
      await p.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
  {
    id: 'user-edit',
    hash: '#/user/manage',
    async open(p) {
      await p.waitForSelector('tbody tr', { timeout: 45000 })
      await p.locator('tbody tr').first().locator('button').last().click()
      await p.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click()
      await p.waitForSelector('[role=dialog]', { timeout: 15000 })
    },
  },
]

for (const sc of SCENARIOS) {
  console.log(`\n### ${sc.id}`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    try {
      await login(page, base)
      await page.goto(`${base}/${SECURE}${sc.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2000)
      await sc.open(page)
      const m = await measureDialog(page)
      if (sc.id === 'user-edit') {
        const bal = await page.evaluate(() => {
          const lbl = [...document.querySelectorAll('[role=dialog] label')].find((l) =>
            l.textContent?.includes('余额') && !l.textContent?.includes('佣金'),
          )
          const wrap = lbl?.nextElementSibling || lbl?.parentElement?.querySelector('div')
          return wrap?.outerHTML?.slice(0, 500)
        })
        console.log(name, JSON.stringify({ ...m, balanceHtml: bal }, null, 2))
      } else {
        console.log(name, JSON.stringify(m, null, 2))
      }
    } catch (e) {
      console.log(name, 'ERR', e.message)
    }
    await browser.close()
  }
}
