import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

const routes = [
  ['safe', '#/config/system/safe'],
  ['subscribe', '#/config/system/subscribe'],
  ['telegram', '#/config/system/telegram'],
  ['invite', '#/config/system/invite'],
]

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function extract(page, base, hash) {
  await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  return page.evaluate(() => {
    const content = document.querySelector('.flex-1.w-full') || document.querySelector('main') || document.body
    const labels = [...content.querySelectorAll('label')].map((l) => l.textContent?.trim()).filter(Boolean)
    const switches = content.querySelectorAll('[role=switch]').length
    const selects = content.querySelectorAll('select').length
    const inputs = content.querySelectorAll('input:not([type=hidden])').length
    return { labels, switches, selects, inputs }
  })
}

const browser = await chromium.launch()
for (const [id, hash] of routes) {
  const rp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const cp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(rp, REF)
  await login(cp, CMP)
  const r = await extract(rp, REF, hash)
  const c = await extract(cp, CMP, hash)
  console.log(`\n=== ${id} ===`)
  console.log('ref', { switches: r.switches, selects: r.selects, inputs: r.inputs, labels: r.labels.length })
  console.log('cmp', { switches: c.switches, selects: c.selects, inputs: c.inputs, labels: c.labels.length })
  for (let i = 0; i < Math.max(r.labels.length, c.labels.length); i++) {
    if (r.labels[i] !== c.labels[i]) {
      console.log(`  label[${i}] ref: ${r.labels[i]}`)
      console.log(`  label[${i}] cmp: ${c.labels[i]}`)
    }
  }
  await rp.close()
  await cp.close()
}
await browser.close()
