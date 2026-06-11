import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function snap(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input#email, input[name="email"]').first().fill('admin@example.com')
    await page.locator('input[type="password"]').first().fill('your-password')
    await page.locator('button[type="submit"], form button').last().click()
    await page.waitForTimeout(4000)
  }
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(3000)
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="card"]')].slice(0, 8).map((c) => ({
      tag: c.tagName,
      cls: c.className?.slice?.(0, 80),
      tables: c.querySelectorAll('table').length,
      rows: c.querySelectorAll('[class*="row"], tr, [role=row]').length,
    }))
    return {
      tables: document.querySelectorAll('table').length,
      gridRows: document.querySelectorAll('.grid').length,
      sample: cards,
      trafficSnippet: document.body.innerText.includes('流量排行'),
      queueSnippet: document.body.innerText.includes('队列'),
    }
  })
  console.log(label, JSON.stringify(info, null, 2))
  await browser.close()
}

await snap(REF, '7001')
await snap(CMP, '7002')
