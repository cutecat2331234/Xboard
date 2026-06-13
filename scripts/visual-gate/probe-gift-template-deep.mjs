import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

async function openGiftEdit(page, base) {
  await page.goto(`${base}/${SEC}#/finance/gift-card`, { waitUntil: 'domcontentloaded' })
  await page.locator('[role=tab]:has-text("模板")').first().click().catch(() => {})
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('tbody button:has-text("编辑")').first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(800)
}

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await openGiftEdit(page, base)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const scroll = dlg?.querySelector('.overflow-y-auto')
    const outer = scroll?.firstElementChild
    const cards = [...(outer?.querySelectorAll('.rounded-xl') || [])]
    const desc = dlg?.querySelector('textarea')
    const dr = desc?.getBoundingClientRect()
    return {
      dialog: dlg ? { w: Math.round(dlg.getBoundingClientRect().width), h: Math.round(dlg.getBoundingClientRect().height) } : null,
      scrollH: scroll ? Math.round(scroll.getBoundingClientRect().height) : null,
      scrollContentH: scroll ? scroll.scrollHeight : null,
      outerCls: outer?.className?.slice(0, 80),
      cards: cards.map((c, i) => ({
        i,
        h: Math.round(c.getBoundingClientRect().height),
        cls: c.className.slice(0, 60),
      })),
      desc: dr ? { h: Math.round(dr.height), minH: getComputedStyle(desc).minHeight, hCss: getComputedStyle(desc).height } : null,
      inputs: [...(dlg?.querySelectorAll('input:not([type=hidden])') || [])].slice(0, 8).map((el) => ({
        h: Math.round(el.getBoundingClientRect().height),
        ph: el.getAttribute('placeholder')?.slice(0, 20),
      })),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
