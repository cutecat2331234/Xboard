import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  await page.waitForTimeout(2000)
}

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/plan`)
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("Add"), button:has-text("添加")').first().click()
  await page.waitForSelector('[role=dialog]')
  await page.waitForTimeout(500)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const fields = [...dlg.querySelectorAll('[class*="space-y"], [class*="xb-stack"]')].slice(0, 12)
    const inputs = [...dlg.querySelectorAll('input:not([type=hidden])')].slice(0, 4)
    return {
      fieldStacks: fields.map((el) => ({
        cls: el.className.slice(0, 60),
        h: Math.round(el.getBoundingClientRect().height),
        mt: getComputedStyle(el).marginTop,
      })),
      inputs: inputs.map((el) => ({
        h: Math.round(el.getBoundingClientRect().height),
        shadow: getComputedStyle(el).boxShadow.slice(0, 40),
      })),
      labels: [...dlg.querySelectorAll('label')].slice(0, 4).map((l) => ({
        text: l.textContent?.slice(0, 20),
        h: Math.round(l.getBoundingClientRect().height),
        fs: getComputedStyle(l).fontSize,
        tt: getComputedStyle(l).textTransform,
      })),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
