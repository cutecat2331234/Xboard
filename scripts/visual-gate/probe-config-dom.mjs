import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(2000)
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
}

function probeDom() {
  const labels = [...document.querySelectorAll('label.font-medium, label.text-base')]
    .filter((l) => l.textContent && l.textContent.length < 60)
    .map((l) => {
      const p = l.parentElement
      const kids = p ? [...p.children].map((c) => {
        if (c === l) return 'LABEL'
        if (c.matches('input,select,textarea')) return 'CTRL'
        if (c.querySelector('[role=switch]')) return 'SWITCH'
        if (c.className?.includes?.('muted') || c.className?.includes?.('0.8rem')) return 'DESC'
        return c.tagName
      }) : []
      return { text: l.textContent.trim().slice(0, 35), order: kids.join('>') }
    })
  return {
    switches: document.querySelectorAll('[role=switch]').length,
    inputs: document.querySelectorAll('input:not([type=hidden])').length,
    selects: document.querySelectorAll('select').length,
    labels: labels.slice(0, 20),
  }
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/telegram']) {
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    const r = await page.evaluate(probeDom)
    console.log(`\n=== ${name} ${hash} ===`)
    console.log(JSON.stringify(r, null, 2))
    await ctx.close()
  }
}
await browser.close()
