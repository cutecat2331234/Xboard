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

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/server/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("添加节点")').first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(800)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const scroll = dlg?.querySelector('.overflow-y-auto')
    const header = dlg?.querySelector('.border-b, [class*="DialogHeader"]')
    const blocks = [...(scroll?.querySelectorAll(':scope > div > *') || scroll?.children?.[0]?.children || [])]
    const inputs = [...(dlg?.querySelectorAll('input:not([type=hidden])') || [])].map((el) => ({
      h: Math.round(el.getBoundingClientRect().height),
      ph: el.getAttribute('placeholder')?.slice(0, 24) || el.type,
    }))
    return {
      dialog: dlg ? { w: Math.round(dlg.getBoundingClientRect().width), h: Math.round(dlg.getBoundingClientRect().height) } : null,
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      scrollH: scroll ? Math.round(scroll.getBoundingClientRect().height) : null,
      scrollContentH: scroll ? scroll.scrollHeight : null,
      blockCount: blocks.length,
      blocks: blocks.slice(0, 15).map((el) => ({
        tag: el.tagName,
        cls: el.className?.slice?.(0, 60) || '',
        h: Math.round(el.getBoundingClientRect().height),
      })),
      inputs: inputs.slice(0, 12),
      typeSelect: dlg?.querySelector('[role=combobox]')?.getBoundingClientRect?.()?.height,
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
