/**
 * Full admin route audit: DOM features + pixel diff vs 7001 (zh-CN).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REF = process.env.VG_REF || 'http://43.248.77.134:7001'
const CMP = process.env.VG_CMP || 'http://43.248.77.134:7002'
const SECURE = process.env.VG_SECURE || 'd7f5c92b'
const ADMIN_EMAIL = process.env.VG_ADMIN_EMAIL || 'admin@xboard.local'
const ADMIN_PASSWORD = process.env.VG_ADMIN_PASSWORD || 'Xboard@2026'

const ROUTES = [
  { id: 'dashboard', hash: '#/' },
  { id: 'config-site', hash: '#/config/system' },
  { id: 'config-safe', hash: '#/config/system/safe' },
  { id: 'config-subscribe', hash: '#/config/system/subscribe' },
  { id: 'config-invite', hash: '#/config/system/invite' },
  { id: 'config-server', hash: '#/config/system/server' },
  { id: 'config-email', hash: '#/config/system/email' },
  { id: 'config-telegram', hash: '#/config/system/telegram' },
  { id: 'config-app', hash: '#/config/system/app' },
  { id: 'config-subscribe-template', hash: '#/config/system/subscribe-template' },
  { id: 'plugin', hash: '#/config/plugin' },
  { id: 'theme', hash: '#/config/theme' },
  { id: 'notice', hash: '#/config/notice' },
  { id: 'payment', hash: '#/config/payment' },
  { id: 'knowledge', hash: '#/config/knowledge' },
  { id: 'server_manage', hash: '#/server/manage' },
  { id: 'server_machine', hash: '#/server/machine' },
  { id: 'server_group', hash: '#/server/group' },
  { id: 'server_route', hash: '#/server/route' },
  { id: 'plan', hash: '#/finance/plan' },
  { id: 'order', hash: '#/finance/order' },
  { id: 'coupon', hash: '#/finance/coupon' },
  { id: 'gift-card', hash: '#/finance/gift-card' },
  { id: 'user', hash: '#/user/manage' },
  { id: 'ticket', hash: '#/user/ticket' },
  { id: 'traffic-reset', hash: '#/traffic-reset' },
]

const TABLE_ROUTES = new Set([
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

async function login(page, base, attempt = 1) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const onSignIn =
    page.url().includes('sign-in') ||
    (await page.locator('input[type="password"]').count()) > 0
  if (onSignIn) {
    const email = page.locator('input[name="email"], input[type="email"], input[type="text"]').first()
    if ((await email.count()) > 0) {
      await email.waitFor({ state: 'visible', timeout: 30000 })
      await email.fill(ADMIN_EMAIL)
      await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD)
      await page.locator('button[type="submit"], form button').last().click()
      await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
    } else {
      await page.goto(`${base}/${SECURE}#/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    }
  }
  await page.waitForTimeout(2000)
  const hasZh = await page.evaluate(() => /[\u4e00-\u9fff]/.test(document.body.innerText.slice(0, 500)))
  if (!hasZh && attempt < 3) {
    await login(page, base, attempt + 1)
  }
}

async function ensureZhPage(page, base, url) {
  for (let i = 0; i < 3; i++) {
    const hasZh = await page.evaluate(() => /[\u4e00-\u9fff]/.test(document.body.innerText.slice(0, 800)))
    if (hasZh) return true
    await login(page, base)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2500)
  }
  return false
}

async function loginAndSaveState(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  const state = await ctx.storageState()
  await ctx.close()
  return state
}

function diffPct(a, b) {
  const img1 = PNG.sync.read(a)
  const img2 = PNG.sync.read(b)
  const w = Math.min(img1.width, img2.width)
  const h = Math.min(img1.height, img2.height)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(img1.data, img2.data, out.data, w, h, { threshold: 0.1 })
  return { pct: (n / (w * h)) * 100, w, h, n, out }
}

async function maskVolatile(page, routeId) {
  await page.evaluate(
    ({ isTable, isConfig }) => {
      if (isTable) {
        document.querySelectorAll('tbody td').forEach((td) => {
          td.textContent = '•'
        })
      }
      if (isConfig) {
        document.querySelectorAll('input:not([type=hidden]), textarea').forEach((el) => {
          el.value = 'x'
          el.setAttribute('value', 'x')
        })
      }
      document.querySelectorAll('.monaco-editor .view-lines').forEach((el) => {
        el.style.opacity = '0'
      })
    },
    { isTable: TABLE_ROUTES.has(routeId), isConfig: routeId.startsWith('config-') },
  )
}

/** Main content below PageToolbar (4rem); exclude w-64 shell sidebar. */
const CONFIG_CLIP = { x: 256, y: 64, width: 1024, height: 656 }

const outDir = path.join(__dir, 'output', 'audit-round29')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const report = []

const refState = await loginAndSaveState(browser, REF)
const cmpState = await loginAndSaveState(browser, CMP)

for (const route of ROUTES) {
  const refCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: refState })
  const cmpCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: cmpState })
  const refPage = await refCtx.newPage()
  const cmpPage = await cmpCtx.newPage()
  try {
    const url = (b) => `${b}/${SECURE}${route.hash}`
    await refPage.goto(url(REF), { waitUntil: 'domcontentloaded', timeout: 90000 })
    await cmpPage.goto(url(CMP), { waitUntil: 'domcontentloaded', timeout: 90000 })
    await ensureZhPage(refPage, REF, url(REF))
    await ensureZhPage(cmpPage, CMP, url(CMP))
    await refPage.waitForTimeout(3500)
    await cmpPage.waitForTimeout(3500)
    if (route.id.startsWith('config-') && route.id !== 'config-subscribe-template') {
      await refPage.waitForSelector('h3.text-lg', { timeout: 15000 }).catch(() => {})
      await cmpPage.waitForSelector('h3.text-lg', { timeout: 15000 }).catch(() => {})
    }
    if (route.id === 'config-subscribe-template') {
      await refPage.waitForSelector('.monaco-editor', { timeout: 15000 }).catch(() => {})
      await cmpPage.waitForSelector('.monaco-editor', { timeout: 15000 }).catch(() => {})
      await refPage.waitForTimeout(1000)
      await cmpPage.waitForTimeout(1000)
    }
    if (['config-email', 'ticket', 'config-subscribe-template'].includes(route.id)) {
      await refPage.waitForSelector('[role=tablist] [role=tab]', { timeout: 20000 }).catch(() => {})
      await cmpPage.waitForSelector('[role=tablist] [role=tab]', { timeout: 20000 }).catch(() => {})
      if (route.id === 'config-email') {
        await cmpPage.waitForSelector('h1, h3', { timeout: 15000 }).catch(() => {})
        await cmpPage.waitForTimeout(1500)
      }
    }
    if (TABLE_ROUTES.has(route.id)) {
      await refPage.waitForSelector('tbody tr', { timeout: 45000 }).catch(() => {})
      await cmpPage.waitForSelector('tbody tr', { timeout: 45000 }).catch(() => {})
    }

    const snap = async (page) =>
      page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim(),
        dialogs: document.querySelectorAll('[role=dialog]').length,
        monaco: document.querySelectorAll('.monaco-editor').length,
        tabs: document.querySelectorAll('[role=tablist] [role=tab]').length,
        tables: document.querySelectorAll('table').length,
        asideLucide: document.querySelectorAll('aside .lucide').length,
        asideTabler: document.querySelectorAll('aside .tabler-icon, aside [class*="tabler-icon"]').length,
        hasChinese: /[\u4e00-\u9fff]/.test(document.body.innerText.slice(0, 500)),
      }))

    await maskVolatile(refPage, route.id)
    await maskVolatile(cmpPage, route.id)

    const refMeta = await snap(refPage)
    const cmpMeta = await snap(cmpPage)
    const shotOpts = route.id.startsWith('config-') ? { clip: CONFIG_CLIP } : {}
    const refBuf = await refPage.screenshot(shotOpts)
    const cmpBuf = await cmpPage.screenshot(shotOpts)
    const { pct, out } = diffPct(refBuf, cmpBuf)
    fs.writeFileSync(path.join(outDir, `${route.id}-diff.png`), PNG.sync.write(out))

    const limit = route.id === 'dashboard' ? 0.5 : 1
    report.push({
      id: route.id,
      diffPct: +pct.toFixed(3),
      pass: pct < limit,
      limit,
      ref: refMeta,
      cmp: cmpMeta,
      gaps: [
        refMeta.monaco !== cmpMeta.monaco ? `monaco ${refMeta.monaco} vs ${cmpMeta.monaco}` : null,
        refMeta.tabs !== cmpMeta.tabs ? `tabs ${refMeta.tabs} vs ${cmpMeta.tabs}` : null,
        refMeta.asideLucide !== cmpMeta.asideLucide ? `asideLucide ${refMeta.asideLucide} vs ${cmpMeta.asideLucide}` : null,
        !cmpMeta.hasChinese && refMeta.hasChinese ? 'cmp missing Chinese' : null,
      ].filter(Boolean),
    })
  } catch (e) {
    report.push({ id: route.id, error: String(e) })
  }
  await refPage.close()
  await cmpPage.close()
  await refCtx.close()
  await cmpCtx.close()
}

await browser.close()
const outPath = path.join(__dir, 'output', 'audit-round29-report.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log('Wrote', outPath)
const fails = report.filter((r) => r.error || !r.pass)
console.log('FAIL count', fails.length)
for (const f of fails) console.log(f.id, f.diffPct ?? f.error, f.gaps ?? '')
