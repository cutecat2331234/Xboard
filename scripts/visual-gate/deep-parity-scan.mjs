#!/usr/bin/env node
/**
 * Deep parity scan: pixel diff + DOM/text/style comparison 7001 vs 7002.
 * Surfaces routes with visible differences the user would notice.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = process.env.REF_BASE || 'http://127.0.0.1:7001'
const CMP = process.env.CMP_BASE || 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-password'
const USER_EMAIL = process.env.USER_EMAIL || ADMIN_EMAIL
const USER_PASSWORD = process.env.USER_PASSWORD || ADMIN_PASSWORD

const USER_ROUTES =
  'login,dashboard,plan,order,invite,traffic,knowledge,ticket,profile,node'.split(',')
const ADMIN_ROUTES =
  'sign-in,dashboard,config,theme,plan,order,user,ticket,server_manage,payment,gift-card'.split(',')

const ADMIN_HASH = {
  dashboard: '',
  config: 'config/system',
  theme: 'config/theme',
  plan: 'finance/plan',
  order: 'finance/order',
  user: 'user/manage',
  ticket: 'user/ticket',
  server_manage: 'server/manage',
  payment: 'config/payment',
  'gift-card': 'finance/gift-card',
  'sign-in': 'sign-in',
}

const outDir = path.join(__dir, 'output', 'deep-scan')
fs.mkdirSync(outDir, { recursive: true })

async function loadPlaywright() {
  const p = path.join(__dir, 'node_modules/playwright/index.mjs')
  return import(fs.existsSync(p) ? p : 'playwright')
}

async function passportLogin(base, email, password, ver) {
  const res = await fetch(`${base}/api/${ver}/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  return json.status === 'success' ? json.data?.auth_data : null
}

async function setupUserPage(page, base, route) {
  await page.addInitScript(() => {
    localStorage.setItem('locale', process.env.USER_LOCALE || 'en-US')
    localStorage.setItem('xboard_locale', process.env.USER_LOCALE || 'en-US')
  })
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (route !== 'login') {
    const email = page.locator('input[type="email"]')
    if ((await email.count()) > 0) {
      await email.first().fill(USER_EMAIL)
      await page.locator('input[type="password"]').first().fill(USER_PASSWORD)
      let submit = page.locator('.auth-submit, button[type="submit"]').first()
      if ((await submit.count()) === 0) {
        submit = page.locator('.n-button--primary-type').filter({ hasText: /Login|登入|登录/i }).first()
      }
      if ((await submit.count()) === 0) submit = page.locator('.n-button--primary-type').last()
      await submit.click({ force: true }).catch(() => {})
      await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 }).catch(() => {})
    }
    await page.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  }
  await page.waitForTimeout(2500)
}

async function setupAdminPage(page, base, route) {
  const auth = await passportLogin(base, ADMIN_EMAIL, ADMIN_PASSWORD, 'v2')
  await page.goto(`${base}/${SECURE}/#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate((t) => {
    if (t) localStorage.setItem('xboard_admin_auth_data', t)
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  }, auth || '')
  const hash = ADMIN_HASH[route] ?? route
  const url = route === 'sign-in' ? `${base}/${SECURE}/#/sign-in` : `${base}/${SECURE}#/${hash}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(3000)
}

async function extractPageMeta(page) {
  return page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,[data-slot=card-title],.n-card-header__main')]
      .map((e) => norm(e.textContent))
      .filter(Boolean)
    const buttons = [...document.querySelectorAll('button,a.n-button,[role=button]')]
      .map((e) => norm(e.textContent || e.getAttribute('aria-label')))
      .filter((t) => t && t.length < 40)
    const cards = document.querySelectorAll('.n-card,[data-slot=card]').length
    const body = norm(document.body.innerText).slice(0, 500)
    const main = document.querySelector('main,.shell-main,.n-layout-scroll-container') || document.body
    const cs = getComputedStyle(main)
    return {
      headings: [...new Set(headings)],
      buttons: [...new Set(buttons)].sort(),
      cardCount: cards,
      bodySnippet: body,
      mainBg: cs.backgroundColor,
      mainFont: cs.fontFamily?.slice(0, 60),
      mainFontSize: cs.fontSize,
    }
  })
}

function pixelDiffPct(bufA, bufB) {
  const a = PNG.sync.read(bufA)
  const b = PNG.sync.read(bufB)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const diff = new PNG({ width: w, height: h })
  const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 })
  return (n / (w * h)) * 100
}

function diffLists(ref, cmp) {
  const refSet = new Set(ref)
  const cmpSet = new Set(cmp)
  return {
    missing: ref.filter((x) => !cmpSet.has(x)),
    extra: cmp.filter((x) => !refSet.has(x)),
  }
}

async function scanRoute(side, route, setupFn) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch()
  const ctxOpts = { viewport: { width: 1280, height: 900 } }
  const ctxRef = await browser.newContext(ctxOpts)
  const ctxCmp = await browser.newContext(ctxOpts)
  await ctxRef.addInitScript(() => {
    localStorage.setItem('xboard_locale', 'zh-CN')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await ctxCmp.addInitScript(() => {
    localStorage.setItem('xboard_locale', 'zh-CN')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  const pRef = await ctxRef.newPage()
  const pCmp = await ctxCmp.newPage()
  await setupFn(pRef, REF, route)
  await setupFn(pCmp, CMP, route)
  const shotRef = await pRef.screenshot({ fullPage: false })
  const shotCmp = await pCmp.screenshot({ fullPage: false })
  const metaRef = await extractPageMeta(pRef)
  const metaCmp = await extractPageMeta(pCmp)
  const diffPct = pixelDiffPct(shotRef, shotCmp)
  const id = `${side}-${route}`
  if (diffPct > 0.3) {
    fs.writeFileSync(path.join(outDir, `${id}-ref.png`), shotRef)
    fs.writeFileSync(path.join(outDir, `${id}-cmp.png`), shotCmp)
  }
  await browser.close()
  const hDiff = diffLists(metaRef.headings, metaCmp.headings)
  const bDiff = diffLists(metaRef.buttons, metaCmp.buttons)
  const issues = []
  if (diffPct > 0.5) issues.push({ type: 'pixel', pct: diffPct })
  if (hDiff.missing.length) issues.push({ type: 'missing_headings', items: hDiff.missing })
  if (hDiff.extra.length) issues.push({ type: 'extra_headings', items: hDiff.extra })
  if (bDiff.missing.length > 3) issues.push({ type: 'missing_buttons', items: bDiff.missing.slice(0, 15) })
  if (bDiff.extra.length > 3) issues.push({ type: 'extra_buttons', items: bDiff.extra.slice(0, 15) })
  if (metaRef.mainBg !== metaCmp.mainBg) issues.push({ type: 'bg_color', ref: metaRef.mainBg, cmp: metaCmp.mainBg })
  if (metaRef.cardCount !== metaCmp.cardCount) issues.push({ type: 'card_count', ref: metaRef.cardCount, cmp: metaCmp.cardCount })
  return { side, route, diffPct: +diffPct.toFixed(2), issues, metaRef, metaCmp }
}

const results = []
console.log(`Deep scan ${REF} vs ${CMP}\n`)

for (const route of USER_ROUTES) {
  process.stdout.write(`user/${route}... `)
  const r = await scanRoute('user', route, setupUserPage)
  results.push(r)
  console.log(r.diffPct + '%', r.issues.length ? `ISSUES(${r.issues.length})` : 'ok')
}

for (const route of ADMIN_ROUTES) {
  process.stdout.write(`admin/${route}... `)
  const r = await scanRoute('admin', route, setupAdminPage)
  results.push(r)
  console.log(r.diffPct + '%', r.issues.length ? `ISSUES(${r.issues.length})` : 'ok')
}

const flagged = results.filter((r) => r.issues.length > 0).sort((a, b) => b.diffPct - a.diffPct)
const report = { generatedAt: new Date().toISOString(), ref: REF, cmp: CMP, flagged, all: results.map((r) => ({ side: r.side, route: r.route, diffPct: r.diffPct, issueCount: r.issues.length })) }
fs.writeFileSync(path.join(outDir, 'deep-scan-report.json'), JSON.stringify(report, null, 2))

console.log('\n=== TOP DIFFERENCES (by pixel %) ===')
for (const r of flagged.slice(0, 20)) {
  console.log(`\n[${r.side}/${r.route}] pixel=${r.diffPct}%`)
  for (const iss of r.issues) console.log(' ', JSON.stringify(iss))
}
console.log(`\nReport: ${path.join(outDir, 'deep-scan-report.json')}`)
