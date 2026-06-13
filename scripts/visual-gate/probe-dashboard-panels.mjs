import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
  await page.locator('input[type=password]').first().fill('Xboard@2026')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function probe(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => ({
    hasSystemStatus: /系统状态|systemStatus/i.test(document.body.textContent || ''),
    hasQueueWorkload: /队列负载|queueWorkload/i.test(document.body.textContent || ''),
    hasAuditLog: /审计日志|auditLog/i.test(document.body.textContent || ''),
    pageH: document.documentElement.scrollHeight,
    shadowCards: document.querySelectorAll('.rounded-xl.shadow').length,
  }))
  console.log(tag, data)
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
