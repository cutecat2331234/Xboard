import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
  }
}

function getDescs() {
  const form = document.querySelector('.space-y-4')
  if (!form) return []
  return [...form.querySelectorAll('.space-y-2')].map((block) => {
    const label = block.querySelector('label')?.textContent?.trim()
    const desc = block.querySelector('p.text-muted-foreground')?.textContent?.trim()
    return { label, desc }
  }).filter((x) => x.label)
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/invite', '#/config/system/subscribe']) {
  const results = {}
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)
    results[name] = await page.evaluate(getDescs)
    await ctx.close()
  }
  console.log(`\n### ${hash}`)
  const max = Math.max(results['7001'].length, results['7002'].length)
  for (let i = 0; i < max; i++) {
    const a = results['7001'][i]
    const b = results['7002'][i]
    const match = a?.desc === b?.desc && a?.label === b?.label
    if (!match) {
      console.log(`MISMATCH [${a?.label || b?.label}]`)
      console.log('  7001:', a?.desc)
      console.log('  7002:', b?.desc)
    }
  }
}
await browser.close()
