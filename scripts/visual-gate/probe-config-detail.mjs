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
  if (page.url().includes('sign-in')) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function probe(page, base, hash, label) {
  await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  const data = await page.evaluate(() => {
    const content = document.querySelector('.flex-1.w-full') || document.body
    const blocks = [...content.querySelectorAll('.flex.flex-col.gap-2, .flex.flex-col.gap-4 > .flex.flex-col.gap-2')].map((el) => {
      const label = el.querySelector('label')?.textContent?.trim()
      const hasSwitch = !!el.querySelector('[role=switch]')
      const hasSelect = !!el.querySelector('select')
      const hasCombobox = !!el.querySelector('[role=combobox]')
      const hasInput = !!el.querySelector('input:not([type=hidden])')
      const hasTextarea = !!el.querySelector('textarea')
      const hasButton = !!el.querySelector('button')
      const desc = el.querySelector('p.text-\\[0\\.8rem\\]')?.textContent?.trim()?.slice(0, 80)
      return { label, hasSwitch, hasSelect, hasCombobox, hasInput, hasTextarea, hasButton, desc }
    })
    return {
      comboboxes: content.querySelectorAll('[role=combobox]').length,
      selects: content.querySelectorAll('select').length,
      blocks: blocks.filter((b) => b.label || b.hasSwitch || b.hasButton),
    }
  })
  console.log(`\n--- ${label} ---`)
  console.log(JSON.stringify(data, null, 2))
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/telegram']) {
  const rp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const cp = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(rp, REF)
  await login(cp, CMP)
  await probe(rp, REF, hash, `7001 ${hash}`)
  await probe(cp, CMP, hash, `7002 ${hash}`)
  await rp.close()
  await cp.close()
}
await browser.close()
