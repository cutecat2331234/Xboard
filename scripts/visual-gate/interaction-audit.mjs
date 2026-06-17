#!/usr/bin/env node
/**
 * Human-like interaction + animation parity audit (7001 ref vs 7002 cmp).
 * Covers hover, transitions, dialogs, tabs, collapse, carousel, toasts — gaps static pixel gate misses.
 *
 * Usage:
 *   REF_BASE=http://127.0.0.1:7001 CMP_BASE=http://127.0.0.1:7002 \
 *   SECURE_PATH=d7f5c92b ADMIN_EMAIL=admin@xboard.local ADMIN_PASSWORD='Xboard@2026' \
 *   USER_EMAIL=admin@xboard.local USER_PASSWORD='Xboard@2026' \
 *   node scripts/visual-gate/interaction-audit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = process.env.REF_BASE || 'http://127.0.0.1:7001'
const CMP = process.env.CMP_BASE || 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || process.env.ADMIN_SECURE_PATH || ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-password'
const USER_EMAIL = process.env.USER_EMAIL || ADMIN_EMAIL
const USER_PASSWORD = process.env.USER_PASSWORD || ADMIN_PASSWORD

const outDir = path.join(__dir, 'output', 'interaction-audit')
fs.mkdirSync(outDir, { recursive: true })

async function loadPlaywright() {
  const pwPath = path.join(__dir, 'node_modules/playwright/index.mjs')
  if (fs.existsSync(pwPath)) return import(pwPath)
  return import('playwright')
}

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

async function passportLogin(base, email, password, apiVersion = 'v1') {
  const res = await fetch(`${base}/api/${apiVersion}/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (json.status !== 'success' || !json.data?.auth_data) return null
  return json.data.auth_data
}

async function userLogin(page, base) {
  const auth = await passportLogin(base, USER_EMAIL, USER_PASSWORD, 'v1')
  if (auth) {
    await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.evaluate((token) => localStorage.setItem('xboard_auth_data', token), auth)
    await page.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(2000)
    return
  }
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(1500)
  const email = page.locator('input[placeholder*="邮箱"], input[placeholder*="Email"], input[type="email"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await email.fill(USER_EMAIL)
  await page.locator('input[type="password"]').first().fill(USER_PASSWORD)
  let submit = page.locator('.auth-submit, button[type="submit"]').first()
  if ((await submit.count()) === 0) {
    submit = page.locator('.n-button--primary-type').filter({ hasText: /登入|登录|Login/i }).first()
  }
  if ((await submit.count()) > 0) await submit.click()
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

async function adminLogin(page, base) {
  const auth = await passportLogin(base, ADMIN_EMAIL, ADMIN_PASSWORD, 'v2')
  await page.goto(`${base}/${SECURE}/#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate(
    (token) => {
      localStorage.setItem('xboard_admin_auth_data', token)
      localStorage.setItem('xboard_admin_locale', 'zh-CN')
      localStorage.setItem('i18nextLng', 'zh-CN')
    },
    auth || '',
  )
  if (auth) {
    await page.goto(`${base}/${SECURE}#/`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(2500)
    if ((await page.locator('body').innerText()).length > 200) return
  }
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first()
  if (await email.isVisible().catch(() => false)) {
    await email.fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD)
    await page.locator('button[type="submit"], .n-button--primary-type, button').filter({ hasText: /登录|Sign/i }).first().click()
    await page.waitForTimeout(3000)
  }
}

async function readStyle(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      transition: cs.transition,
      transitionDuration: cs.transitionDuration,
      animation: cs.animation,
      animationDuration: cs.animationDuration,
      transform: cs.transform,
      opacity: cs.opacity,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
    }
  }, selector)
}

async function readHoverDelta(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return { missing: true }
    const before = getComputedStyle(el)
    const b = {
      bg: before.backgroundColor,
      color: before.color,
      transform: before.transform,
      opacity: before.opacity,
      boxShadow: before.boxShadow,
    }
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const after = getComputedStyle(el)
    const a = {
      bg: after.backgroundColor,
      color: after.color,
      transform: after.transform,
      opacity: after.opacity,
      boxShadow: after.boxShadow,
    }
    return { before: b, after: a, changed: JSON.stringify(b) !== JSON.stringify(a) }
  }, selector)
}

function diffStyle(ref, cmp, keys) {
  const gaps = []
  for (const k of keys) {
    if (!ref && cmp) gaps.push({ key: k, ref: null, cmp })
    else if (ref && !cmp) gaps.push({ key: k, ref, cmp: null })
    else if (ref && cmp && ref[k] !== cmp[k]) gaps.push({ key: k, ref: ref[k], cmp: cmp[k] })
  }
  return gaps
}

async function runScenario(browser, scenario) {
  const gaps = []
  const evidence = {}

  for (const [label, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript(() => {
      localStorage.setItem('xboard_locale', 'zh-CN')
      localStorage.setItem('xboard_admin_locale', 'zh-CN')
      localStorage.setItem('i18nextLng', 'zh-CN')
    })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    try {
      if (scenario.side === 'user') {
        if (scenario.auth) await userLogin(page, base)
        await page.goto(`${base}/#/${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      } else {
        if (scenario.route !== 'sign-in') await adminLogin(page, base)
        const hash = scenario.adminHash || '#/'
        await page.goto(`${base}/${SECURE}${hash}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      }
      await page.waitForTimeout(scenario.waitMs ?? 2500)

      const snap = { url: page.url(), consoleErrors }

      if (scenario.collectSections) {
        snap.sections = await page.evaluate(() =>
          [...document.querySelectorAll('.n-card, [data-slot=card]')]
            .map((c) => norm(c.querySelector('.n-card-header__main, .n-card-header, [data-slot=card-title]')?.textContent))
            .filter(Boolean),
        )
      }

      if (scenario.hoverSelector) {
        snap.hover = await readHoverDelta(page, scenario.hoverSelector)
      }

      if (scenario.styleSelector) {
        snap.style = await readStyle(page, scenario.styleSelector)
      }

      if (scenario.action) {
        snap.action = await scenario.action(page, base)
      }

      if (scenario.frames) {
        snap.frames = []
        for (const delay of scenario.frames) {
          await page.waitForTimeout(delay)
          const buf = await page.screenshot({ fullPage: false })
          snap.frames.push({ delay, size: buf.length })
        }
      }

      evidence[label] = snap
    } finally {
      await ctx.close()
    }
  }

  if (scenario.collectSections) {
    const refSections = evidence['7001']?.sections || []
    const cmpSections = evidence['7002']?.sections || []
    const missing = refSections.filter((s) => !cmpSections.includes(s))
    const extra = cmpSections.filter((s) => !refSections.includes(s))
    if (missing.length) gaps.push({ type: 'missing_sections', items: missing })
    if (extra.length) gaps.push({ type: 'extra_sections', items: extra })
  }

  if (scenario.hoverSelector) {
    const refH = evidence['7001']?.hover
    const cmpH = evidence['7002']?.hover
    if (refH?.changed && !cmpH?.changed) gaps.push({ type: 'hover_missing', selector: scenario.hoverSelector })
    if (!refH?.changed && cmpH?.changed) gaps.push({ type: 'hover_extra', selector: scenario.hoverSelector })
    if (refH?.changed && cmpH?.changed) {
      const styleGaps = diffStyle(refH.after, cmpH.after, ['bg', 'color', 'transform', 'opacity', 'boxShadow'])
      if (styleGaps.length) gaps.push({ type: 'hover_style_mismatch', selector: scenario.hoverSelector, items: styleGaps })
    }
  }

  if (scenario.styleSelector) {
    const refStyle = evidence['7001']?.style
    const cmpStyle = evidence['7002']?.style
    if (refStyle && cmpStyle) {
      const styleGaps = diffStyle(refStyle, cmpStyle, [
        'transition',
        'transitionDuration',
        'animation',
        'animationDuration',
      ])
      if (styleGaps.length) gaps.push({ type: 'transition_mismatch', selector: scenario.styleSelector, items: styleGaps })
    }
  }

  if (scenario.actionCompare) {
    const actionGaps = scenario.actionCompare(evidence['7001']?.action, evidence['7002']?.action)
    gaps.push(...actionGaps)
  }

  const cmpErrors = evidence['7002']?.consoleErrors?.filter((e) => !/favicon|devtools/i.test(e)) || []
  if (cmpErrors.length) gaps.push({ type: 'console_errors', items: cmpErrors.slice(0, 5) })

  return { id: scenario.id, gaps, evidence }
}

const SCENARIOS = [
  {
    id: 'user-dashboard-shortcut-hover',
    side: 'user',
    route: 'dashboard',
    auth: true,
    hoverSelector: '.dash-card--shortcuts .n-list-item, .dash-card--shortcuts [class*="list-item"]',
  },
  {
    id: 'user-dashboard-carousel-transition',
    side: 'user',
    route: 'dashboard',
    auth: true,
    styleSelector: '.dash-promo-carousel .n-carousel__arrow-group, .dash-promo-carousel [class*="arrow"]',
    action: async (page) => {
      const carousel = page.locator('.dash-promo-carousel').first()
      if (!(await carousel.isVisible().catch(() => false))) return { hasCarousel: false }
      await carousel.hover()
      await page.waitForTimeout(400)
      const arrowVisible = await page
        .locator('.dash-promo-carousel .n-carousel__arrow, .dash-promo-carousel [class*="arrow"]')
        .first()
        .isVisible()
        .catch(() => false)
      return { hasCarousel: true, arrowVisibleOnHover: arrowVisible }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.arrowVisibleOnHover && !cmp?.arrowVisibleOnHover) gaps.push({ type: 'carousel_arrow_hover_missing' })
      if (ref?.hasCarousel && !cmp?.hasCarousel) gaps.push({ type: 'carousel_missing' })
      return gaps
    },
  },
  {
    id: 'user-invite-number-animation',
    side: 'user',
    route: 'invite',
    auth: true,
    action: async (page) => {
      const hasAnim = (await page.locator('.n-number-animation, [class*="number-animation"]').count()) > 0
      const text = await page.evaluate(() => {
        const el = document.querySelector('.invite-balance-card .text-5xl, .invite-balance-card [class*="text-5xl"]')
        return el?.textContent?.trim() || ''
      })
      return { hasNumberAnimation: hasAnim, balanceText: text }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.hasNumberAnimation && !cmp?.hasNumberAnimation) gaps.push({ type: 'number_animation_missing' })
      return gaps
    },
  },
  {
    id: 'user-knowledge-collapse',
    side: 'user',
    route: 'knowledge',
    auth: true,
    action: async (page) => {
      const item = page.locator('.n-collapse-item, [class*="collapse-item"]').first()
      if (!(await item.isVisible().catch(() => false))) return { hasCollapse: false }
      const titleBefore = await item.innerText().catch(() => '')
      await item.click()
      await page.waitForTimeout(600)
      const expanded = await page.evaluate(() => {
        const open = document.querySelector('.n-collapse-item--active, .n-collapse-item.n-collapse-item--active')
        return Boolean(open)
      })
      const contentVisible = await page
        .locator('.n-collapse-item--active .n-collapse-item__content-wrapper, .n-collapse-item--active [class*="collapse-item__content"]')
        .first()
        .isVisible()
        .catch(() => false)
      return { hasCollapse: true, expanded, contentVisible, titleBefore: titleBefore.slice(0, 40) }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.hasCollapse && !cmp?.hasCollapse) gaps.push({ type: 'collapse_missing' })
      if (ref?.expanded && !cmp?.expanded) gaps.push({ type: 'collapse_expand_failed' })
      return gaps
    },
  },
  {
    id: 'user-sidebar-menu-hover',
    side: 'user',
    route: 'dashboard',
    auth: true,
    hoverSelector: '.app-sider .n-menu-item-content, .n-layout-sider .n-menu-item-content',
    styleSelector: '.app-sider .n-menu-item-content, .n-layout-sider .n-menu-item-content',
  },
  {
    id: 'user-auth-tab-switch',
    side: 'user',
    route: 'login',
    auth: false,
    action: async (page, base) => {
      await page.goto(`${base}/#/login?tab=register`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForTimeout(800)
      const registerVisible = await page
        .locator('input[placeholder*="邀请"], input[placeholder*="invite"], input[name="invite_code"]')
        .first()
        .isVisible()
        .catch(() => false)
      await page.goto(`${base}/#/login?tab=forget`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForTimeout(800)
      const forgetVisible = await page
        .locator('input[placeholder*="邮箱"], input[type="email"]')
        .first()
        .isVisible()
        .catch(() => false)
      return { registerTabWorks: registerVisible, forgetTabWorks: forgetVisible }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.registerTabWorks && !cmp?.registerTabWorks) gaps.push({ type: 'register_tab_broken' })
      if (ref?.forgetTabWorks && !cmp?.forgetTabWorks) gaps.push({ type: 'forget_tab_broken' })
      return gaps
    },
  },
  {
    id: 'admin-dashboard-sections',
    side: 'admin',
    route: 'dashboard',
    adminHash: '#/',
    action: async (page) => {
      const headings = await page.evaluate(() =>
        [...document.querySelectorAll('h2, h3, [data-slot=card-title]')]
          .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      )
      return { headings }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      const legacyOnly = ['系统状态', '队列工作负载', '审计日志', 'System Status', 'Queue Workload', 'Audit Log']
      const extra = (cmp?.headings || []).filter((h) => legacyOnly.some((k) => h.includes(k)))
      const missing = (ref?.headings || []).filter((h) => !(cmp?.headings || []).includes(h))
      if (extra.length) gaps.push({ type: 'extra_dashboard_sections', items: extra })
      if (missing.length) gaps.push({ type: 'missing_dashboard_sections', items: missing })
      return gaps
    },
  },
  {
    id: 'admin-dashboard-chart-tab',
    side: 'admin',
    route: 'dashboard',
    adminHash: '#/',
    action: async (page) => {
      const countTab = page.locator('[role="tab"]').filter({ hasText: /数量|count/i }).first()
      if (!(await countTab.isVisible().catch(() => false))) return { hasTabs: false }
      await countTab.click()
      await page.waitForTimeout(800)
      const active = await page.evaluate(() => {
        const t = [...document.querySelectorAll('[role="tab"]')].find((el) => /数量|count/i.test(el.textContent || ''))
        return t?.getAttribute('data-state') === 'active' || t?.getAttribute('aria-selected') === 'true'
      })
      return { hasTabs: true, countTabActive: active }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.hasTabs && !cmp?.hasTabs) gaps.push({ type: 'chart_tabs_missing' })
      if (ref?.countTabActive && !cmp?.countTabActive) gaps.push({ type: 'chart_tab_switch_failed' })
      return gaps
    },
  },
  {
    id: 'admin-user-create-dialog',
    side: 'admin',
    route: 'user',
    adminHash: '#/user/manage',
    action: async (page) => {
      const btn = page.locator('button:has-text("创建用户"), button:has-text("Create User")').first()
      if (!(await btn.isVisible().catch(() => false))) return { canOpen: false }
      await btn.click()
      await page.waitForTimeout(900)
      const dialog = page.locator('[role="dialog"][data-state="open"], [role="dialog"]').first()
      const open = await dialog.isVisible().catch(() => false)
      const transition = open
        ? await page.evaluate(() => {
            const el = document.querySelector('[role="dialog"], .n-modal, [data-state="open"]')
            if (!el) return null
            const cs = getComputedStyle(el)
            return { transition: cs.transition, animation: cs.animation, opacity: cs.opacity }
          })
        : null
      return { canOpen: true, dialogOpen: open, transition }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.dialogOpen && !cmp?.dialogOpen) gaps.push({ type: 'dialog_open_failed', dialog: 'user-create' })
      return gaps
    },
  },
  {
    id: 'admin-sidebar-nav-hover',
    side: 'admin',
    route: 'dashboard',
    adminHash: '#/',
    hoverSelector: 'nav a, aside a, [data-sidebar] a',
  },
  {
    id: 'user-ticket-create-dialog',
    side: 'user',
    route: 'ticket',
    auth: true,
    action: async (page) => {
      const btn = page.locator('button').filter({ hasText: /创建|新建|提交|Create/i }).first()
      if (!(await btn.isVisible().catch(() => false))) return { canOpen: false }
      await btn.click()
      await page.waitForTimeout(900)
      const open = await page.locator('[role="dialog"], .n-modal').first().isVisible().catch(() => false)
      return { canOpen: true, dialogOpen: open }
    },
    actionCompare: (ref, cmp) => {
      const gaps = []
      if (ref?.dialogOpen && !cmp?.dialogOpen) gaps.push({ type: 'dialog_open_failed', dialog: 'ticket-create' })
      return gaps
    },
  },
]

const { chromium } = await loadPlaywright()
const browser = await chromium.launch({ headless: true })

const allResults = []
const allGaps = []

console.log(`Interaction audit: ${REF} vs ${CMP}`)
console.log(`Scenarios: ${SCENARIOS.length}\n`)

for (const scenario of SCENARIOS) {
  process.stdout.write(`  ${scenario.id}... `)
  try {
    const result = await runScenario(browser, scenario)
    allResults.push(result)
    if (result.gaps.length) {
      console.log(`FAIL (${result.gaps.length})`)
      allGaps.push(...result.gaps.map((g) => ({ scenario: scenario.id, ...g })))
    } else {
      console.log('OK')
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`)
    allGaps.push({ scenario: scenario.id, type: 'error', message: e.message })
  }
}

await browser.close()

const report = {
  generatedAt: new Date().toISOString(),
  ref: REF,
  cmp: CMP,
  scenarioCount: SCENARIOS.length,
  gapCount: allGaps.length,
  gaps: allGaps,
  results: allResults.map((r) => ({ id: r.id, gapCount: r.gaps.length, gaps: r.gaps })),
}

const reportPath = path.join(outDir, 'interaction-audit-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log(`\n=== INTERACTION AUDIT SUMMARY ===`)
console.log(`Gaps: ${allGaps.length}`)
if (allGaps.length) {
  console.log(JSON.stringify(allGaps, null, 2))
}
console.log(`Report: ${reportPath}`)
process.exit(allGaps.length > 0 ? 1 : 0)
