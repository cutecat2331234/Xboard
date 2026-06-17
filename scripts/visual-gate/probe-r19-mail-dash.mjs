import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function mailSubject(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/user/manage`)
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("操作")').first().click()
  await page.locator('[role=menuitem]:has-text("发送邮件")').first().click()
  await page.waitForSelector('[role=dialog]')
  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const inputs = [...(dlg?.querySelectorAll('input:not([type=hidden]):not([type=checkbox])') || [])]
    const subject = inputs.find((el) => /主题|subject/i.test(el.closest('div')?.textContent?.slice(0, 30) || '') || inputs[1])
    const hint = subject?.parentElement?.querySelector('p')
    return {
      subjectCls: subject?.className,
      subjectH: subject ? Math.round(subject.getBoundingClientRect().height) : null,
      hintCls: hint?.className,
      scopeSelect: dlg?.querySelector('[role=combobox]')?.className?.slice(0, 120),
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

async function dashOverview(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.rounded-xl.shadow')].find((c) =>
      /数据概览|Overview/i.test(c.querySelector('h3,h2')?.textContent || ''),
    )
    return {
      headerHtml: card?.querySelector('[class*="CardHeader"], .p-6')?.outerHTML?.slice(0, 1200),
      leftCls: card?.querySelector('.p-6 > div')?.className,
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await mailSubject(REF, '7001')
await mailSubject(CMP, '7002')
await dashOverview(REF, '7001')
await dashOverview(CMP, '7002')
