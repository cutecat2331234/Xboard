#!/usr/bin/env node
/**
 * 7002-only smoke: scenarios with no 7001 pixel reference.
 *   - gift-generate: admin gift-card template row → generate dialog
 *   - user-gift-card: user #/gift-card page loads
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cmpBase = process.env.CMP_BASE || 'http://127.0.0.1:7002'
const securePath = process.env.SECURE_PATH || ''
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.ADMIN_PASSWORD || 'your-password'
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output', 'cmp-only')

function hasGatewayError(text) {
  return /502 Bad Gateway|504 Gateway Time-out|504 Gateway Timeout/i.test(text)
}

async function loadPlaywright() {
  const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
  if (fs.existsSync(pwPath)) return import(pathToFileURL(pwPath).href)
  return import('playwright')
}

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

async function ensureGiftTemplate(base) {
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
  await fetch(`${adminPrefix}/gift-card/create-template`, {
    method: 'POST',
    headers: adminHdr,
    body: JSON.stringify({
      name: 'Cmp-Only Gift Template',
      description: 'cmp-only seed',
      type: 1,
      status: 1,
      rewards: { balance: 1000 },
      conditions: {},
      limits: {},
      theme_color: '#2d6565',
      sort: 0,
    }),
  })
}

async function gotoStable(page, url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(1500 + attempt * 500)
    const body = await page.locator('body').innerText()
    if (!hasGatewayError(body)) break
    await page.waitForTimeout(8000 + attempt * 2000)
  }
  const finalBody = await page.locator('body').innerText()
  if (hasGatewayError(finalBody)) throw new Error(`gateway error loading ${url}`)
}

async function adminLogin(page) {
  const url = `${cmpBase}/${securePath}#/sign-in`
  await gotoStable(page, url)
  if (!page.url().includes('sign-in')) return
  const email = page.locator('input[name="email"], input[type="email"], input[type="text"]')
  const password = page.locator('input[name="password"], input[type="password"]')
  if ((await email.count()) === 0) return
  await email.first().fill(adminEmail)
  await password.first().fill(adminPassword)
  const submit = page.locator('button[type="submit"], form button').last()
  if ((await submit.count()) > 0) await submit.click()
  await page
    .waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(2000)
}

async function userLogin(page) {
  await gotoStable(page, `${cmpBase}/#/login`)
  if (!page.url().includes('/login')) return
  const email = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="mail" i]')
  const password = page.locator('input[type="password"]')
  if ((await email.count()) === 0) return
  await email.first().fill(adminEmail)
  await password.first().fill(adminPassword)
  let submit = page.locator('.auth-submit, button[type="submit"]').first()
  if ((await submit.count()) === 0) {
    submit = page.locator('.n-button--primary-type').filter({ hasText: /登入|登录|Login/i }).first()
  }
  if ((await submit.count()) > 0) await submit.click()
  await page
    .waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(2000)
}

async function testGiftGenerate(page, consoleErrors) {
  await ensureGiftTemplate(cmpBase)
  await adminLogin(page)
  await gotoStable(page, `${cmpBase}/${securePath}#/finance/gift-card`)
  await page
    .locator(
      '[role=tab]:has-text("模板"), [role=tab]:has-text("Templates"), [role=tab]:has-text("Template")',
    )
    .first()
    .click({ timeout: 12000 })
    .catch(() => {})
  await page.waitForSelector('tbody tr', { state: 'visible', timeout: 90000 })
  const generateBtn = page
    .locator(
      'tbody tr:first-child button:has-text("生成兑换码"), tbody tr:first-child button:has-text("Generate")',
    )
    .first()
  await generateBtn.scrollIntoViewIfNeeded({ timeout: 30000 })
  await generateBtn.click({ timeout: 30000 })
  await page.waitForSelector('[role=dialog]', { timeout: 15000 })
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor({ state: 'visible', timeout: 10000 })
  const text = await dialog.innerText()
  if (!/生成|Generate|兑换码|Redeem/i.test(text)) {
    throw new Error('gift-generate dialog missing expected copy')
  }
  fs.mkdirSync(outDir, { recursive: true })
  await dialog.screenshot({ path: path.join(outDir, 'gift-generate-cmp.png') })
  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join('; ')}`)
  console.log('gift-generate: PASS')
}

async function testUserGiftCard(page, consoleErrors) {
  await userLogin(page)
  await gotoStable(page, `${cmpBase}/#/gift-card`)
  await page.waitForSelector('.gift-card-hint, .n-card', { timeout: 45000 })
  const hint = page.locator('.gift-card-hint').first()
  if ((await hint.count()) === 0) {
    throw new Error('user-gift-card: missing .gift-card-hint')
  }
  const redeemBtn = page.locator('button').filter({ hasText: /兑换|Redeem/i }).first()
  if ((await redeemBtn.count()) === 0) {
    throw new Error('user-gift-card: missing redeem button')
  }
  fs.mkdirSync(outDir, { recursive: true })
  await page.locator('.n-card, main').first().screenshot({ path: path.join(outDir, 'user-gift-card-cmp.png') })
  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join('; ')}`)
  console.log('user-gift-card: PASS')
}

async function runScenario(id, fn) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch()
  const consoleErrors = []
  const ignoreConsole = (text) =>
    /favicon|Failed to load resource|net::ERR_|ChunkLoadError|ResizeObserver loop/i.test(text)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !ignoreConsole(msg.text())) consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  try {
    console.log(`\n=== ${id} (cmp-only) ===`)
    await fn(page, consoleErrors)
    return { id, pass: true }
  } catch (e) {
    console.error(`${id}: FAIL`, e.message)
    return { id, pass: false, error: e.message }
  } finally {
    await browser.close()
  }
}

async function main() {
  const results = []
  results.push(await runScenario('gift-generate', testGiftGenerate))
  results.push(await runScenario('user-gift-card', testUserGiftCard))

  const failures = results.filter((r) => !r.pass)
  const reportPath = path.join(outDir, 'cmp-only-report.json')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ passed: failures.length === 0, timestamp: new Date().toISOString(), results }, null, 2),
  )
  console.log(`\nWrote ${reportPath}`)

  if (failures.length) {
    console.error('\nVERIFY_CMP_ONLY_FAILED', failures.map((f) => f.id))
    process.exit(1)
  }
  console.log('\nVERIFY_CMP_ONLY_PASS 2/2')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
