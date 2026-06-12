#!/usr/bin/env node
/**
 * Pixel diff 7001 (ref) vs 7002 (rewrite).
 *
 * Thresholds:
 *   - core routes (login/dashboard or sign-in/dashboard): ≤0.5%
 *   - page routes: ≤1%
 *   - DIALOG_ROUTES (admin modal flows): ≤2%
 *
 * Usage:
 *   SIDE=user ROUTES=login,dashboard node visual-gate.mjs
 *   SIDE=admin ROUTES=sign-in,dashboard,config node visual-gate.mjs
 *   SIDE=admin ROUTES=user-create,plan-add,server-add,gift-template,user-mail node visual-gate.mjs
 *
 * See scripts/visual-gate/README.md for route lists and dialog flows.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const refBase = process.env.REF_BASE || 'http://127.0.0.1:7001'
const cmpBase = process.env.CMP_BASE || 'http://127.0.0.1:7002'
const side = process.env.SIDE || 'user'
const securePath = process.env.SECURE_PATH || ''
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.ADMIN_PASSWORD || 'your-password'
const viewportWidth = Number(process.env.VIEWPORT_W || 1280)
const viewportHeight = Number(process.env.VIEWPORT_H || 900)

const USER_ROUTES_BASE =
  'login,register,forgetpassword,dashboard,plan,plan-detail,order,order-detail,invite,traffic,knowledge,ticket,ticket-detail,profile,node'
const USER_ROUTES_DEFAULT =
  USER_ROUTES_BASE + (process.env.INCLUDE_GIFT_CARD === '1' ? ',gift-card' : '')
const ADMIN_ROUTES_DEFAULT =
  'sign-in,dashboard,config,config-safe,config-subscribe,config-invite,config-server,config-email,config-telegram,config-app,config-subscribe-template,plugin,theme,notice,payment,knowledge,server_manage,server_machine,server_group,server_route,plan,order,coupon,gift-card,user,ticket,traffic-reset,user-create,plan-add,server-add,gift-template,user-mail'
const ADMIN_LOCALE = process.env.ADMIN_LOCALE || 'zh-CN'
/** Legacy 7001 on ref server uses vue-i18n `locale` key; default en-US for pixel parity. */
const USER_LOCALE = process.env.USER_LOCALE || 'en-US'

const routes = (process.env.ROUTES || (side === 'admin' ? ADMIN_ROUTES_DEFAULT : USER_ROUTES_DEFAULT))
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean)

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'output', side)
const CORE = new Set(side === 'admin' ? ['sign-in', 'dashboard'] : ['login', 'dashboard'])

/** Admin modal flows: open dialog on parent page, screenshot dialog, allow ≤2% diff. */
const DIALOG_ROUTES = new Set(['user-create', 'plan-add', 'server-add', 'gift-template', 'user-mail'])
const DIALOG_PARENT = {
  'user-create': 'user',
  'user-mail': 'user',
  'plan-add': 'plan',
  'server-add': 'server_manage',
  'gift-template': 'gift-card',
}

/** Logged-in user pages: compare main content (exclude header/sider shell noise). */
const USER_SHELL_ROUTES = new Set([
  'dashboard',
  'plan',
  'plan-detail',
  'order',
  'order-detail',
  'invite',
  'gift-card',
  'traffic',
  'knowledge',
  'ticket',
  'ticket-detail',
  'profile',
  'node',
])
const USER_PUBLIC_ROUTES = new Set(['login', 'register', 'forgetpassword'])
const USER_MAIN_BOX = { x: 236, y: 60, w: 1044, h: 840 }

const USER_ROUTE_PATHS = {
  'gift-card': 'gift-card', // rewrite-only; excluded from USER_ROUTES_DEFAULT unless INCLUDE_GIFT_CARD=1
  'plan-detail': (fx) => `plan/${fx.planId}`,
  'order-detail': (fx) => (fx.tradeNo ? `order/${fx.tradeNo}` : null),
  'ticket-detail': (fx) => `ticket/${fx.ticketId}`,
}

/** Rewrite (7002) uses single /login with tab query; legacy (7001) keeps separate hash routes. */
const USER_ROUTE_PATHS_REWRITE = {
  register: 'login?tab=register',
  forgetpassword: 'login?tab=forget',
}

const ADMIN_ROUTE_PATHS = {
  'sign-in': 'sign-in',
  dashboard: '',
  config: 'config/system',
  'config-safe': 'config/system/safe',
  'config-subscribe': 'config/system/subscribe',
  'config-invite': 'config/system/invite',
  'config-server': 'config/system/server',
  'config-email': 'config/system/email',
  'config-telegram': 'config/system/telegram',
  'config-app': 'config/system/app',
  'config-subscribe-template': 'config/system/subscribe-template',
  plugin: 'config/plugin',
  theme: 'config/theme',
  notice: 'config/notice',
  payment: 'config/payment',
  knowledge: 'config/knowledge',
  server_manage: 'server/manage',
  server_machine: 'server/machine',
  server_group: 'server/group',
  server_route: 'server/route',
  plan: 'finance/plan',
  order: 'finance/order',
  coupon: 'finance/coupon',
  'gift-card': 'finance/gift-card',
  user: 'user/manage',
  ticket: 'user/ticket',
  'traffic-reset': 'traffic-reset',
}

let userFixtures = { planId: 1, tradeNo: '', ticketId: 1 }

async function passportLogin(base, apiVersion = 'v2') {
  const res = await fetch(`${base}/api/${apiVersion}/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const json = await res.json()
  if (json.status !== 'success' || !json.data?.auth_data) return null
  return json.data.auth_data
}

/** Seed plan + pending order on shared DB so order-detail gate can run. */
async function ensureUserGateFixtures(base) {
  const adminAuth = await passportLogin(base, 'v2')
  if (!adminAuth) return
  const adminHdr = {
    Authorization: adminAuth,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const adminPrefix = `${base}/api/v2/${securePath}`

  let plansJson = await fetch(`${adminPrefix}/plan/fetch`, { headers: adminHdr }).then((r) => r.json())
  let planId = plansJson.data?.[0]?.id

  if (!planId) {
    await fetch(`${adminPrefix}/plan/save`, {
      method: 'POST',
      headers: adminHdr,
      body: JSON.stringify({
        name: 'Gate Test Plan',
        transfer_enable: 100,
        prices: { monthly: 100 },
      }),
    })
    plansJson = await fetch(`${adminPrefix}/plan/fetch`, { headers: adminHdr }).then((r) => r.json())
    planId = plansJson.data?.[0]?.id
  }
  if (!planId) return

  const plan = plansJson.data?.[0]
  if (!plan?.show || !plan?.sell) {
    await fetch(`${adminPrefix}/plan/update`, {
      method: 'POST',
      headers: adminHdr,
      body: JSON.stringify({ id: planId, show: true, sell: true, renew: true }),
    })
  }

  const userAuth = await passportLogin(base, 'v1')
  if (!userAuth) return
  const userHdr = { Authorization: userAuth, Accept: 'application/json', 'Content-Type': 'application/json' }

  const ticketsJson = await fetch(`${base}/api/v1/user/ticket/fetch`, { headers: userHdr }).then((r) =>
    r.json(),
  )
  const ticketId = ticketsJson.data?.[0]?.id ?? 1

  const ordersJson = await fetch(`${base}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) =>
    r.json(),
  )
  const existingPending = ordersJson.data?.find((o) => o.status === 0)
  if (existingPending?.trade_no) {
    userFixtures = { planId, tradeNo: existingPending.trade_no, ticketId }
    return
  }

  let tradeNo = ''

  const saveJson = await fetch(`${base}/api/v1/user/order/save`, {
    method: 'POST',
    headers: userHdr,
    body: JSON.stringify({ plan_id: planId, period: 'month_price' }),
  }).then((r) => r.json())
  if (saveJson.status === 'success' && saveJson.data) tradeNo = saveJson.data

  if (!tradeNo) {
    const assignJson = await fetch(`${adminPrefix}/order/assign`, {
      method: 'POST',
      headers: adminHdr,
      body: JSON.stringify({
        email: adminEmail,
        plan_id: planId,
        period: 'month_price',
        total_amount: 10000,
      }),
    }).then((r) => r.json())
    if (assignJson.status === 'success' && assignJson.data) tradeNo = assignJson.data
  }

  if (!tradeNo) {
    const refreshed = await fetch(`${base}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) =>
      r.json(),
    )
    tradeNo = refreshed.data?.find((o) => o.status === 0)?.trade_no ?? ''
  }

  if (!tradeNo) {
    const retrySave = await fetch(`${base}/api/v1/user/order/save`, {
      method: 'POST',
      headers: userHdr,
      body: JSON.stringify({ plan_id: planId, period: 'month_price' }),
    }).then((r) => r.json())
    if (retrySave.status === 'success' && retrySave.data) tradeNo = retrySave.data
  }

  userFixtures = { planId, tradeNo, ticketId }
}

/** Seed a gift card template so gift-template dialog gate can open edit on empty DBs. */
async function ensureAdminGiftTemplateFixture(base) {
  const adminAuth = await passportLogin(base, 'v2')
  if (!adminAuth) return
  const adminHdr = {
    Authorization: adminAuth,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const adminPrefix = `${base}/api/v2/${securePath}`

  const tplJson = await fetch(`${adminPrefix}/gift-card/templates?per_page=1`, { headers: adminHdr }).then(
    (r) => r.json(),
  )
  const items = Array.isArray(tplJson?.data)
    ? tplJson.data
    : Array.isArray(tplJson?.data?.data)
      ? tplJson.data.data
      : []
  if (items.length > 0) return

  for (let attempt = 0; attempt < 3; attempt++) {
    const createRes = await fetch(`${adminPrefix}/gift-card/create-template`, {
      method: 'POST',
      headers: adminHdr,
      body: JSON.stringify({
        name: 'Gate Gift Template',
        description: 'visual gate seed',
        type: 1,
        status: 1,
        rewards: { balance: 1000 },
        conditions: {},
        limits: {},
        theme_color: '#2d6565',
        sort: 0,
      }),
    })
    if (createRes.ok) break
    const body = await createRes.text().catch(() => '')
    console.warn(
      `gift-template seed attempt ${attempt + 1} failed on ${base}: ${createRes.status} ${body.slice(0, 200)}`,
    )
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
}

function routeToPath(route, { rewrite = false } = {}) {
  if (side === 'admin') {
    if (route === 'sign-in') return 'sign-in'
    if (route === 'dashboard') return ''
    return ADMIN_ROUTE_PATHS[route] ?? route.replace(/_/g, '/')
  }
  if (rewrite && USER_ROUTE_PATHS_REWRITE[route]) return USER_ROUTE_PATHS_REWRITE[route]
  const mapped = USER_ROUTE_PATHS[route]
  if (typeof mapped === 'function') return mapped(userFixtures)
  if (mapped) return mapped
  return route
}

function isRewriteBase(base) {
  return base === cmpBase || /:7002\b/.test(base)
}

function buildUrl(base, route) {
  const pathPart = routeToPath(route, { rewrite: isRewriteBase(base) })
  if (side === 'user' && route === 'order-detail' && !userFixtures.tradeNo) return null
  if (side === 'admin') {
    const hash = pathPart === 'sign-in' ? '#/sign-in' : pathPart ? `#/${pathPart}` : '#/'
    return `${base}/${securePath}${hash}`
  }
  return `${base}/#/${pathPart}`
}

function cropPng(img, { x, y, w, h }) {
  const box = new PNG({ width: w, height: h })
  PNG.bitblt(img, box, x, y, w, h, 0, 0)
  return box
}

/** Crop both PNGs to min(width) x min(height) so pixelmatch never aborts on size mismatch. */
function normalizePngPair(img1, img2) {
  const width = Math.min(img1.width, img2.width)
  const height = Math.min(img1.height, img2.height)
  if (img1.width === width && img1.height === height && img2.width === width && img2.height === height) {
    return [img1, img2]
  }
  const a = new PNG({ width, height })
  const b = new PNG({ width, height })
  PNG.bitblt(img1, a, 0, 0, width, height, 0, 0)
  PNG.bitblt(img2, b, 0, 0, width, height, 0, 0)
  return [a, b]
}

function diffPct(img1, img2, diffPath) {
  const [a, b] = normalizePngPair(img1, img2)
  const { width, height } = a
  const diff = new PNG({ width, height })
  const n = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.15, includeAA: false })
  if (diffPath) fs.writeFileSync(diffPath, PNG.sync.write(diff))
  return (n / (width * height)) * 100
}

function scorePng(refPng, cmpPng, diffPath, route) {
  if (side === 'user' && USER_SHELL_ROUTES.has(route)) {
    const refMain = cropPng(refPng, USER_MAIN_BOX)
    const cmpMain = cropPng(cmpPng, USER_MAIN_BOX)
    return diffPct(refMain, cmpMain, diffPath)
  }
  if (DIALOG_ROUTES.has(route)) {
    if (refPng.width !== cmpPng.width || refPng.height !== cmpPng.height) {
      console.warn(
        `${route}: dialog screenshot size ref=${refPng.width}x${refPng.height} cmp=${cmpPng.width}x${cmpPng.height} → cropping to min`,
      )
    }
    const [refNorm, cmpNorm] = normalizePngPair(refPng, cmpPng)
    return diffPct(refNorm, cmpNorm, diffPath)
  }
  return diffPct(refPng, cmpPng, diffPath)
}

async function loadPlaywright() {
  const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
  if (fs.existsSync(pwPath)) return import(pathToFileURL(pwPath).href)
  return import('playwright')
}

async function forceLocale(page) {
  if (side === 'admin') {
    const locale = process.env.ADMIN_LOCALE || 'zh-CN'
    await page.evaluate((lng) => {
      localStorage.setItem('xboard_admin_locale', lng)
      localStorage.setItem('i18nextLng', lng)
    }, locale)
    const sample = await page.locator('h1, button, aside').first().innerText().catch(() => '')
    const hasChinese = /[\u4e00-\u9fff]/.test(sample)
    const wantChinese = locale.startsWith('zh')
    if (hasChinese !== wantChinese) {
      await page.reload({ waitUntil: 'networkidle', timeout: 90000 })
      await page.waitForTimeout(2000)
    }
    return
  }
  await page.evaluate((lng) => {
    localStorage.setItem('xboard_locale', lng)
    localStorage.setItem('locale', lng)
  }, USER_LOCALE)
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(1500)
}

function hasGatewayError(text) {
  return /502 Bad Gateway|504 Gateway Time-out|504 Gateway Timeout/i.test(text)
}

const ADMIN_MASK_TABLE_ROUTES = new Set([
  'server_manage',
  'server_machine',
  'server_group',
  'server_route',
  'plan',
  'order',
  'coupon',
  'gift-card',
  'user',
  'ticket',
  'traffic-reset',
])

async function clickVisible(page, selectors, timeout = 12000) {
  const per = Math.max(3000, Math.floor(timeout / selectors.length))
  for (const selector of selectors) {
    const loc = page.locator(selector).first()
    try {
      await loc.waitFor({ state: 'visible', timeout: per })
      await loc.click({ timeout: per })
      return
    } catch {
      /* try next selector */
    }
  }
  throw new Error(`no visible control for selectors: ${selectors.join(' | ')}`)
}

async function openAdminDialog(page, route) {
  if (route === 'user-create') {
    await clickVisible(page, [
      'button:has-text("创建用户")',
      'button:has-text("Create User")',
    ])
  } else if (route === 'user-mail') {
    await clickVisible(page, ['button:has-text("操作")', 'button:has-text("Actions")'])
    await clickVisible(page, [
      '[role=menuitem]:has-text("发送邮件")',
      '[role=menuitem]:has-text("Send Email")',
      '[role=menuitem]:has-text("Send Mail")',
    ])
  } else if (route === 'gift-template') {
    await page
      .locator(
        '[role=tab]:has-text("模板管理"), [role=tab]:has-text("模板"), [role=tab]:has-text("Templates"), [role=tab]:has-text("Template")',
      )
      .first()
      .click({ timeout: 12000 })
      .catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await page
      .waitForSelector('tbody tr', { state: 'attached', timeout: 90000 })
      .catch(() => {})
    await page.evaluate(() => {
      const scrollers = document.querySelectorAll('.overflow-auto, [class*="overflow-auto"]')
      scrollers.forEach((el) => {
        if (el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth
      })
    })
    const editLoc = page
      .locator(
        '[data-testid="gift-template-edit"], tbody button:has-text("编辑"), tbody button:has-text("Edit")',
      )
      .first()
    await editLoc.scrollIntoViewIfNeeded({ timeout: 90000 }).catch(() => {})
    await editLoc.click({ timeout: 30000, force: true })
  } else if (route === 'plan-add') {
    await clickVisible(page, [
      'button:has-text("添加套餐")',
      'button:has-text("Add Plan")',
      'button:has-text("添加")',
      'button:has-text("Add")',
    ])
  } else if (route === 'server-add') {
    await clickVisible(page, [
      'button:has-text("添加节点")',
      'button:has-text("添加服务器")',
      'button:has-text("Add Node")',
      'button:has-text("Add Server")',
      'button:has-text("添加")',
      'button:has-text("Add")',
    ])
  } else {
    throw new Error(`unknown dialog route: ${route}`)
  }
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(500)
}

async function maskDialogVolatile(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('[role=dialog] input:not([type=file]), [role=dialog] textarea, [role=dialog] select')
      .forEach((el) => {
        if (el instanceof HTMLInputElement) {
          if (el.readOnly || el.type === 'date' || el.type === 'hidden') return
        }
        if (el instanceof HTMLButtonElement && el.type === 'button') return
        if (el instanceof HTMLSelectElement) {
          if (el.options.length > 0) el.selectedIndex = 0
          return
        }
        el.value = 'x'
      })
  })
}

async function screenshotDialog(page, shotOpts) {
  const dialog = page.locator('[role=dialog]').first()
  if ((await dialog.count()) > 0) return dialog.screenshot(shotOpts)
  return page.screenshot(shotOpts)
}

function routeLimit(route) {
  if (CORE.has(route)) return 0.5
  if (DIALOG_ROUTES.has(route)) return 2
  return 1
}

async function maskAdminVolatile(page, route) {
  if (side !== 'admin') return
  const maskTable = ADMIN_MASK_TABLE_ROUTES.has(route)
  const maskMonaco = route === 'config-subscribe-template'
  const maskCharts = route === 'dashboard'
  if (!maskTable && !maskMonaco && !maskCharts) return
  await page.evaluate(({ maskTable: mt, maskMonaco: mm, maskCharts: mc }) => {
    if (mt) {
      document.querySelectorAll('tbody td').forEach((td) => {
        td.textContent = '•'
      })
    }
    if (mm) {
      document.querySelectorAll('.monaco-editor .view-lines').forEach((el) => {
        el.style.opacity = '0'
      })
    }
    if (mc) {
      document.querySelectorAll('.recharts-wrapper, .recharts-surface, .recharts-responsive-container').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        }
      })
      document.querySelectorAll('[class*="text-2xl"][class*="font-bold"]').forEach((el) => {
        if (el.closest('.rounded-xl')) el.textContent = '—'
      })
    }
  }, { maskTable, maskMonaco, maskCharts })
}

const ADMIN_TABLE_ROUTES = new Set([
  'config',
  'plugin',
  'theme',
  'notice',
  'payment',
  'knowledge',
  'server_manage',
  'server_machine',
  'server_group',
  'server_route',
  'plan',
  'order',
  'coupon',
  'gift-card',
  'user',
  'ticket',
  'traffic-reset',
])

async function waitAdminRouteReady(page, route) {
  if (!ADMIN_TABLE_ROUTES.has(route)) return
  await page
    .waitForFunction(
      () => {
        const tbody = document.querySelector('tbody')
        if (!tbody) return false
        const text = tbody.textContent || ''
        if (/loading|加载中/i.test(text)) return false
        return tbody.querySelectorAll('tr').length > 0
      },
      { timeout: 45000 },
    )
    .catch(() => {})
}

async function waitUserRouteReady(page, route) {
  if (route === 'dashboard') {
    await page
      .waitForFunction(
        () => {
          const card = [...document.querySelectorAll('.n-card')].find((c) =>
            c.textContent?.includes('我的订阅'),
          )
          if (!card) return false
          if (card.querySelector('.n-skeleton')) return false
          return Boolean(
            card.querySelector('.cursor-pointer') ||
              card.querySelector('.n-button--primary-type'),
          )
        },
        { timeout: 45000 },
      )
      .catch(() => {})
  }
  if (route === 'plan') {
    await page.waitForSelector('.plan-list-title, .n-grid', { timeout: 15000 }).catch(() => {})
  }
  if (route === 'order') {
    await page.waitForSelector('.order-list-table .n-data-table, .n-data-table', { timeout: 15000 }).catch(() => {})
  }
  if (route === 'invite') {
    await page
      .waitForSelector('.n-data-table-tbody .n-data-table-tr', { timeout: 45000 })
      .catch(() => {})
    // Legacy balance uses NNumberAnimation (duration 500ms).
    await page.waitForTimeout(600)
  }
  if (route === 'ticket-detail') {
    await page
      .waitForSelector('.ticket-detail-card, .reply-group', { timeout: 45000 })
      .catch(() => {})
  }
  if (route === 'plan-detail') {
    await page.waitForSelector('.n-radio-group, .order-detail-page, .n-card', { timeout: 45000 }).catch(() => {})
  }
  if (route === 'register') {
    await page
      .waitForFunction(
        () => {
          const hash = window.location.hash
          return hash.includes('register') || hash.includes('tab=register')
        },
        { timeout: 15000 },
      )
      .catch(() => {})
  }
  if (route === 'forgetpassword') {
    await page
      .waitForFunction(
        () => {
          const hash = window.location.hash
          return hash.includes('forgetpassword') || hash.includes('tab=forget')
        },
        { timeout: 15000 },
      )
      .catch(() => {})
  }
  if (route === 'order-detail') {
    await page.waitForSelector('.order-detail-page', { timeout: 45000 }).catch(() => {})
    await page
      .waitForSelector('.order-detail-page .summary-panel, .summary-panel, .order-summary', {
        timeout: 45000,
      })
      .catch(() => {})
    await page
      .waitForSelector('.summary-panel__grand, .order-summary__grand', { timeout: 30000 })
      .catch(() => {})
    await page
      .waitForFunction(
        () => {
          const panel =
            document.querySelector('.summary-panel__grand') ||
            document.querySelector('.order-summary__grand')
          return panel && /\d/.test(panel.textContent || '')
        },
        { timeout: 30000 },
      )
      .catch(() => {})
    await page
      .evaluate(async () => {
        await document.fonts?.ready
        const panel = document.querySelector('.summary-panel, .order-summary')
        if (!panel) return
        const targets = panel.querySelectorAll(
          '.summary-panel__grand, .summary-panel__plan-price, .summary-panel__amount, .order-summary__grand',
        )
        await Promise.all([...targets].map(() => document.fonts.ready))
      })
      .catch(() => {})
    await page.evaluate(() => document.fonts?.ready).catch(() => {})
    await page.waitForTimeout(4000)
  }
}

async function gotoStable(page, url, { waitChart = false, route = '' } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(1500 + attempt * 500)
    const body = await page.locator('body').innerText()
    if (!hasGatewayError(body)) {
      await forceLocale(page)
      break
    }
    await page.waitForTimeout(8000 + attempt * 2000)
  }
  const finalBody = await page.locator('body').innerText()
  if (hasGatewayError(finalBody)) {
    throw new Error(`gateway error loading ${url}`)
  }
  if (waitChart) {
    await page.waitForSelector('.recharts-wrapper', { timeout: 30000 }).catch(() => {})
  }
  if (route && side === 'user') await waitUserRouteReady(page, route)
  if (route && side === 'admin') await waitAdminRouteReady(page, route)
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(500)
  await page.mouse.move(8, 8)
  await page.waitForTimeout(2500)
}


async function resolveUserFixtures(page, base) {
  const seedTradeNo = userFixtures.tradeNo
  const seedPlanId = userFixtures.planId
  const fixtures = await page
    .evaluate(
      async ({ origin, seedTradeNo, seedPlanId }) => {
        const auth = localStorage.getItem('xboard_auth_data')
        if (!auth) return null
        const headers = { Authorization: auth, Accept: 'application/json' }
        const load = async (path) => {
          const res = await fetch(`${origin}/api/v1${path}`, { headers })
          const json = await res.json()
          if (json.status !== 'success') return null
          return json.data
        }
        const [plans, orders, tickets] = await Promise.all([
          load('/user/plan/fetch'),
          load('/user/order/fetch'),
          load('/user/ticket/fetch'),
        ])
        const pending = orders?.find((o) => o.status === 0)
        const tradeNo = pending?.trade_no || seedTradeNo || ''
        const planId = plans?.[0]?.id ?? seedPlanId ?? 1
        return {
          planId,
          tradeNo,
          ticketId: tickets?.[0]?.id ?? 1,
        }
      },
      { origin: base, seedTradeNo, seedPlanId },
    )
    .catch(() => null)
  if (fixtures) {
    userFixtures = {
      ...userFixtures,
      ...fixtures,
      tradeNo: fixtures.tradeNo || userFixtures.tradeNo,
      planId: fixtures.planId || userFixtures.planId,
    }
  }
}

async function userLogin(page, base) {
  await gotoStable(page, buildUrl(base, 'login'))

  if (!page.url().includes('/login')) {
    return
  }

  const email = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="mail" i]')
  const password = page.locator('input[type="password"]')
  if ((await email.count()) === 0) return

  await email.first().fill(adminEmail)
  await password.first().fill(adminPassword)

  let submit = page.locator('.auth-submit, button[type="submit"]').first()
  if ((await submit.count()) === 0) {
    submit = page.locator('.n-button--primary-type').filter({ hasText: /登入|登录|Login/i }).first()
  }
  if ((await submit.count()) === 0) {
    submit = page.locator('.n-button--primary-type').last()
  }
  if ((await submit.count()) > 0) {
    await submit.click()
  }

  await page
    .waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(2000)
  await resolveUserFixtures(page, base)
}

async function adminLogin(page, base) {
  await gotoStable(page, buildUrl(base, 'sign-in'))

  if (!page.url().includes('sign-in')) {
    return
  }

  const email = page.locator('input[name="email"], input[type="email"], input[type="text"]')
  const password = page.locator('input[name="password"], input[type="password"]')
  if ((await email.count()) === 0) return

  await email.first().fill(adminEmail)
  await password.first().fill(adminPassword)

  const submit = page.locator('button[type="submit"], form button').last()
  if ((await submit.count()) > 0) {
    await submit.click()
  }

  await page
    .waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(2000)
}

async function main() {
  const { chromium } = await loadPlaywright()
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const failures = []

  const needsUserFixtures =
    side === 'user' && routes.some((r) => r === 'order-detail' || /-detail$/.test(r))
  if (needsUserFixtures) {
    await ensureUserGateFixtures(refBase)
    if (!userFixtures.tradeNo) await ensureUserGateFixtures(cmpBase)
  }

  const needsGiftTemplate =
    side === 'admin' && routes.some((r) => r === 'gift-template' || r === 'gift-card')
  if (needsGiftTemplate) {
    await ensureAdminGiftTemplateFixture(refBase)
    await ensureAdminGiftTemplateFixture(cmpBase)
  }

  for (const route of routes) {
    const ctx = await browser.newContext({ viewport: { width: viewportWidth, height: viewportHeight } })

    await ctx.addInitScript((isAdmin, adminLocale, userLocale) => {
      if (isAdmin) {
        localStorage.setItem('xboard_admin_locale', adminLocale)
        localStorage.setItem('i18nextLng', adminLocale)
        if (window.location.hash.includes('sign-in')) {
          localStorage.removeItem('xboard_admin_auth_data')
        }
      } else {
        localStorage.setItem('xboard_locale', userLocale)
        localStorage.setItem('locale', userLocale)
        if (window.location.hash.includes('/login')) {
          localStorage.removeItem('xboard_auth_data')
        }
      }
    }, side === 'admin', ADMIN_LOCALE, USER_LOCALE)

    const consoleErrors = []
    const ignoreConsole = (text) =>
      /favicon|Failed to load resource|net::ERR_|ChunkLoadError|ResizeObserver loop/i.test(text)

    if (side === 'admin' && route === 'sign-in') {
      await ctx.addInitScript(() => {
        localStorage.removeItem('xboard_admin_auth_data')
      })
    }
    if (side === 'user' && USER_PUBLIC_ROUTES.has(route)) {
      await ctx.addInitScript(() => {
        localStorage.removeItem('xboard_auth_data')
      })
    }

    const isDialog = side === 'admin' && DIALOG_ROUTES.has(route)
    const pageRoute = isDialog ? DIALOG_PARENT[route] : route
    const waitChart = side === 'admin' && pageRoute === 'dashboard'
    const shotOpts = { fullPage: process.env.FULL_PAGE === '1' }

    const refPage = await ctx.newPage()
    if (side === 'admin' && route !== 'sign-in') await adminLogin(refPage, refBase)
    const needsUserLogin = side === 'user' && !USER_PUBLIC_ROUTES.has(route)
    if (needsUserLogin) await userLogin(refPage, refBase)
    const urlRefBuilt = buildUrl(refBase, pageRoute)
    if (!urlRefBuilt) {
      console.log(`${route}: SKIP (no fixture)`)
      await ctx.close()
      continue
    }
    await gotoStable(refPage, urlRefBuilt, { waitChart, route: pageRoute })
    if (isDialog) {
      await openAdminDialog(refPage, route)
      await maskDialogVolatile(refPage)
    } else {
      await maskAdminVolatile(refPage, pageRoute)
    }
    const refPng = PNG.sync.read(
      isDialog ? await screenshotDialog(refPage, shotOpts) : await refPage.screenshot(shotOpts),
    )
    await refPage.close()

    await new Promise((r) => setTimeout(r, 4000))

    const cmpPage = await ctx.newPage()
    cmpPage.on('console', (m) => {
      if (m.type() === 'error' && !ignoreConsole(m.text())) consoleErrors.push(m.text())
    })
    if (side === 'admin' && route !== 'sign-in') await adminLogin(cmpPage, cmpBase)
    if (needsUserLogin) await userLogin(cmpPage, cmpBase)
    const urlCmpBuilt = buildUrl(cmpBase, pageRoute)
    if (!urlCmpBuilt) {
      await ctx.close()
      continue
    }
    await gotoStable(cmpPage, urlCmpBuilt, { waitChart, route: pageRoute })
    if (isDialog) {
      await openAdminDialog(cmpPage, route)
      await maskDialogVolatile(cmpPage)
    } else {
      await maskAdminVolatile(cmpPage, pageRoute)
    }
    const cmpPng = PNG.sync.read(
      isDialog ? await screenshotDialog(cmpPage, shotOpts) : await cmpPage.screenshot(shotOpts),
    )
    const diffPath = path.join(outDir, `${route}-diff.png`)
    const pct = scorePng(refPng, cmpPng, diffPath, route)
    const limit = routeLimit(route)
    const ok = pct <= limit && consoleErrors.length === 0
    const line = `${route}: diff=${pct.toFixed(3)}% limit=${limit}% consoleErrors=${consoleErrors.length} ${ok ? 'PASS' : 'FAIL'}`
    console.log(line)
    if (!ok) failures.push(line)
    await ctx.close()
  }

  await browser.close()
  if (failures.length) {
    console.error('VISUAL_GATE_FAILED', failures)
    process.exit(1)
  }
  console.log('VISUAL_GATE_PASS', side)
}

main()
