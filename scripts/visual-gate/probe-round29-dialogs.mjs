/**
 * Probe dialog open flows + pixel diff for extended admin parity.
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

const SCENARIOS = [
  {
    id: 'user-edit',
    hash: '#/user/manage',
    wait: 'tbody tr',
    async open(page) {
      const menu = page.locator('tbody tr').first().locator('button').last()
      await menu.click({ timeout: 8000 })
      await page.locator('[role=menuitem]:has-text("编辑")').first().click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'user-create',
    hash: '#/user/manage',
    wait: 'tbody tr',
    async open(page) {
      await page.locator('button:has-text("创建用户")').first().click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'user-mail',
    hash: '#/user/manage',
    wait: 'tbody tr',
    async open(page) {
      await page.locator('button:has-text("操作")').first().click({ timeout: 8000 })
      await page.locator('[role=menuitem]:has-text("发送邮件")').first().click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'gift-template-edit',
    hash: '#/finance/gift-card',
    wait: 'tbody tr',
    async open(page) {
      await page.locator('[role=tab]:has-text("模板")').first().click({ timeout: 8000 }).catch(() => {})
      const editBtn = page
        .locator('[data-testid="gift-template-edit"], tbody button:has-text("编辑")')
        .first()
      await editBtn.waitFor({ state: 'visible', timeout: 45000 })
      await editBtn.click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'gift-generate',
    hash: '#/finance/gift-card',
    wait: 'tbody tr',
    async open(page) {
      await page.locator('[role=tab]:has-text("模板")').click({ timeout: 8000 }).catch(() => {})
      await page.waitForTimeout(500)
      const row = page.locator('tbody tr').first()
      const genBtn = row.locator('button').filter({ hasText: /生成/ })
      if ((await genBtn.count()) > 0) {
        await genBtn.first().click({ timeout: 8000 })
      } else {
        await row.locator('td').last().locator('button').nth(1).click({ timeout: 8000 })
      }
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'plan-add',
    hash: '#/finance/plan',
    wait: 'button:has-text("添加")',
    async open(page) {
      await page.locator('button:has-text("添加套餐"), button:has-text("添加")').first().click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
  {
    id: 'server-add',
    hash: '#/server/manage',
    wait: 'button:has-text("添加")',
    async open(page) {
      await page.locator('button:has-text("添加节点"), button:has-text("添加")').first().click({ timeout: 8000 })
      await page.waitForSelector('[role=dialog]', { timeout: 10000 })
    },
  },
]

async function login(page, base, attempt = 1) {
  try {
    await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  } catch (e) {
    if (attempt < 3) return login(page, base, attempt + 1)
    throw e
  }
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(2000)
}

function cropPng(img, w, h) {
  const out = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * img.width + x) * 4
      const di = (y * w + x) * 4
      out.data[di] = img.data[si]
      out.data[di + 1] = img.data[si + 1]
      out.data[di + 2] = img.data[si + 2]
      out.data[di + 3] = img.data[si + 3]
    }
  }
  return out
}

function diffPct(a, b) {
  const img1 = PNG.sync.read(a)
  const img2 = PNG.sync.read(b)
  const w = Math.min(img1.width, img2.width)
  const h = Math.min(img1.height, img2.height)
  const c1 = cropPng(img1, w, h)
  const c2 = cropPng(img2, w, h)
  const out = new PNG({ width: w, height: h })
  const n = pixelmatch(c1.data, c2.data, out.data, w, h, { threshold: 0.1 })
  return { pct: (n / (w * h)) * 100, out }
}

import { maskDialogVolatile } from './mask-utils.mjs'

async function shotDialog(page) {
  const dialog = page.locator('[role=dialog][data-state=open]').first()
  if ((await dialog.count()) > 0) {
    return dialog.screenshot()
  }
  const fallback = page.locator('[role=dialog]').first()
  if ((await fallback.count()) > 0) {
    return fallback.screenshot()
  }
  return page.screenshot()
}

const outDir = path.join(__dir, 'output', 'audit-round30-dialogs')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const report = []

for (const sc of SCENARIOS) {
  const row = { id: sc.id, refOpened: false, cmpOpened: false, diffPct: null, pass: false, error: null }
  try {
    for (const [side, base] of [
      ['ref', REF],
      ['cmp', CMP],
    ]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      await login(page, base)
      await page.goto(`${base}/${SECURE}${sc.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForSelector(sc.wait, { timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(2000)
      try {
        await sc.open(page)
        await page.waitForSelector('[role=dialog][data-state=open], [role=dialog]', { timeout: 15000 })
        await page.waitForTimeout(2000)
        if (side === 'ref') row.refOpened = true
        else row.cmpOpened = true
        await maskDialogVolatile(page)
        const buf = await shotDialog(page)
        fs.writeFileSync(path.join(outDir, `${sc.id}-${side}.png`), buf)
      } catch (e) {
        row.error = `${side}: ${e.message}`
      }
      await page.close()
    }
    const refPath = path.join(outDir, `${sc.id}-ref.png`)
    const cmpPath = path.join(outDir, `${sc.id}-cmp.png`)
    if (fs.existsSync(refPath) && fs.existsSync(cmpPath)) {
      const { pct, out } = diffPct(fs.readFileSync(refPath), fs.readFileSync(cmpPath))
      row.diffPct = +pct.toFixed(3)
      row.pass = pct <= 2
      fs.writeFileSync(path.join(outDir, `${sc.id}-diff.png`), PNG.sync.write(out))
    }
  } catch (e) {
    row.error = String(e)
  }
  report.push(row)
  console.log(sc.id, row.refOpened && row.cmpOpened ? `${row.diffPct}% ${row.pass ? 'PASS' : 'FAIL'}` : `SKIP ${row.error || ''}`)
}

await browser.close()
fs.writeFileSync(path.join(__dir, 'output', 'audit-round30-dialogs.json'), JSON.stringify(report, null, 2))
