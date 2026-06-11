/**
 * Extended live functional sweep: auth + user + admin routes on 7001 vs 7002.
 */
import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const USER_EMAIL = 'admin@xboard.local'
const USER_PASS = 'Xboard@2026'
const ADMIN_EMAIL = 'admin@xboard.local'
const ADMIN_PASS = 'Xboard@2026'

const USER_ROUTES = [
  'login',
  'register',
  'forgetpassword',
  'dashboard',
  'plan',
  'order',
  'invite',
  'node',
  'traffic',
  'knowledge',
  'ticket',
  'profile',
]

const ADMIN_ROUTES = [
  'sign-in',
  'dashboard',
  'config/system',
  'config/plugin',
  'theme',
  'plan',
  'order',
  'user',
  'ticket',
  'server_manage',
  'server_group',
  'server_route',
  'server_machine',
  'payment',
  'coupon',
  'gift-card',
  'knowledge',
  'notice',
]

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function collectClickables(page) {
  return page.evaluate(() => {
    const trim = (s) => (s || '').replace(/\s+/g, ' ').trim()
    const sel = 'button, a[href], .n-button, input[type=submit], [role=button], [role=tab], .n-tabs-tab'
    const els = [...document.querySelectorAll(sel)]
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const st = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0'
      })
      .map((el) => {
        const text = trim(
          (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '').trim(),
        )
        const href = el.getAttribute('href') || ''
        const role = el.getAttribute('role') || el.tagName
        return `${role}:${text.slice(0, 50)}${href ? `@${href.slice(0, 40)}` : ''}`
      })
      .filter(Boolean)
      .sort()
  })
}

async function collectSections(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card, [data-slot=card]')].map((c) => {
      const title = c.querySelector('.n-card-header__main, .n-card-header, [data-slot=card-title]')?.textContent?.trim()
      const btns = [...c.querySelectorAll('button, a')].filter((b) => b.offsetParent).map((b) => b.textContent?.trim()).filter(Boolean)
      return { title: title?.slice(0, 50), btns: btns.slice(0, 10) }
    })
    return cards.filter((c) => c.title || c.btns.length)
  })
}

async function userLogin(page, base) {
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(2000)
  const email = page.locator('input[placeholder*="邮箱"], input[placeholder*="Email"], input[type="email"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await email.fill(USER_EMAIL)
  await page.locator('input[type="password"]').first().fill(USER_PASS)
  const submit = page.locator(
    'form .auth-submit, form .n-button--primary-type, form button[type="submit"], button:has-text("登入"), button:has-text("登录")',
  ).first()
  await submit.click({ timeout: 30000 })
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

async function adminLogin(page, base, securePath) {
  await page.goto(`${base}/${securePath}/#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(2000)
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first()
  if (await email.isVisible().catch(() => false)) {
    await email.fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').first().fill(ADMIN_PASS)
    await page.locator('button[type="submit"], .n-button--primary-type, button').filter({ hasText: /登录|Sign/i }).first().click()
    await page.waitForTimeout(3000)
  }
}

async function sweepUserRoute(route) {
  const browser = await chromium.launch()
  const results = {}
  for (const [label, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
    const p = await ctx.newPage()
    if (['login', 'register', 'forgetpassword'].includes(route)) {
      await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await p.waitForTimeout(2500)
    } else {
      await userLogin(p, base)
      await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
      await p.waitForTimeout(2500)
    }
    results[label] = {
      clickables: await collectClickables(p),
      sections: await collectSections(p),
      url: p.url(),
      bodySnippet: await p.evaluate(() => document.body.innerText.slice(0, 300)),
    }
    await ctx.close()
  }
  await browser.close()
  return diffResults('user', route, results)
}

async function sweepAdminRoute(route, securePath) {
  const browser = await chromium.launch()
  const results = {}
  for (const [label, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
    const p = await ctx.newPage()
    if (route === 'sign-in') {
      await p.goto(`${base}/${securePath}/#/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    } else {
      await adminLogin(p, base, securePath)
      await p.goto(`${base}/${securePath}/#/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
    }
    await p.waitForTimeout(2500)
    results[label] = {
      clickables: await collectClickables(p),
      sections: await collectSections(p),
      url: p.url(),
      bodySnippet: await p.evaluate(() => document.body.innerText.slice(0, 300)),
    }
    await ctx.close()
  }
  await browser.close()
  return diffResults('admin', route, results)
}

function fuzzyMissing(refItems, cmpItems) {
  const cmpNorm = cmpItems.map((x) => x.replace(/@\S+/g, '').toLowerCase())
  return refItems.filter((ref) => {
    const r = ref.replace(/@\S+/g, '').toLowerCase()
    return !cmpNorm.some((c) => c === r || (c.includes(r.slice(r.indexOf(':') + 1)) && r.length > 8))
  })
}

function diffResults(side, route, results) {
  const refSet = results['7001'].clickables
  const cmpSet = results['7002'].clickables
  const onlyRef = fuzzyMissing(refSet, cmpSet)
  const onlyCmp = fuzzyMissing(cmpSet, refSet)

  const refTitles = results['7001'].sections.map((s) => s.title).filter(Boolean)
  const cmpTitles = results['7002'].sections.map((s) => s.title).filter(Boolean)
  const missingTitles = refTitles.filter((t) => !cmpTitles.includes(t))
  const extraTitles = cmpTitles.filter((t) => !refTitles.includes(t))

  const err7002 = /502|504|错误|failed|undefined|白屏/i.test(results['7002'].bodySnippet || '')

  return { side, route, onlyRef, onlyCmp, missingTitles, extraTitles, err7002, results }
}

async function detectSecurePath() {
  return process.env.ADMIN_SECURE_PATH || 'd7f5c92b'
}

const gaps = []
const securePath = await detectSecurePath()
console.log('Admin secure path:', securePath)

for (const route of USER_ROUTES) {
  console.log(`\n--- user/${route} ---`)
  const r = await sweepUserRoute(route)
  if (r.err7002) {
    console.log('7002 ERROR:', r.results['7002'].bodySnippet)
    gaps.push({ side: 'user', route, type: 'error', p0: true })
  }
  if (r.onlyRef.length) {
    console.log('7002 missing:', r.onlyRef.slice(0, 12))
    gaps.push({ side: 'user', route, type: 'missing_clickable', items: r.onlyRef, p0: r.onlyRef.some((x) => /支付|结账|提交|创建|删除|关闭/i.test(x)) })
  }
  if (r.onlyCmp.length) console.log('7002 extra:', r.onlyCmp.slice(0, 8))
  if (r.missingTitles.length) {
    console.log('7002 missing sections:', r.missingTitles)
    gaps.push({ side: 'user', route, type: 'missing_section', items: r.missingTitles })
  }
  if (!r.onlyRef.length && !r.missingTitles.length && !r.err7002) console.log('OK')
}

for (const route of ADMIN_ROUTES) {
  console.log(`\n--- admin/${route} ---`)
  const r = await sweepAdminRoute(route, securePath)
  if (r.err7002) {
    console.log('7002 ERROR:', r.results['7002'].bodySnippet)
    gaps.push({ side: 'admin', route, type: 'error', p0: true })
  }
  if (r.onlyRef.length) {
    console.log('7002 missing:', r.onlyRef.slice(0, 12))
    gaps.push({ side: 'admin', route, type: 'missing_clickable', items: r.onlyRef, p0: r.onlyRef.some((x) => /批量|删除|保存|创建|Horizon/i.test(x)) })
  }
  if (r.onlyCmp.length) console.log('7002 extra:', r.onlyCmp.slice(0, 8))
  if (r.missingTitles.length) {
    console.log('7002 missing sections:', r.missingTitles)
    gaps.push({ side: 'admin', route, type: 'missing_section', items: r.missingTitles })
  }
  if (!r.onlyRef.length && !r.missingTitles.length && !r.err7002) console.log('OK')
}

console.log('\n=== GAP SUMMARY ===')
const p0 = gaps.filter((g) => g.p0 || g.type === 'error')
const p1 = gaps.filter((g) => !g.p0 && g.type !== 'error')
console.log('P0:', JSON.stringify(p0, null, 2))
console.log('P1:', JSON.stringify(p1, null, 2))
