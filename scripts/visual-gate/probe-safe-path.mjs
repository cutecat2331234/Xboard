import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function probe(page, base) {
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(4000)
  return page.evaluate(() => {
    const labels = [...document.querySelectorAll('label')].map((l) => {
      const block = l.closest('.space-y-2,.xb-stack-2')
      const input = block?.querySelector('input,textarea')
      return { label: l.textContent?.trim(), inputType: input?.type, value: input?.value }
    })
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent?.includes('后台路径'))
    const block = label?.closest('.space-y-2,.xb-stack-2')
    const input = block?.querySelector('input')
    const s = input ? getComputedStyle(input) : null
    return {
      allInputs: labels.filter((x) => x.inputType),
      blockCls: block?.className,
      html: block?.outerHTML?.slice(0, 800),
      inputType: input?.type,
      inputCls: input?.className,
      paddingRight: s?.paddingRight,
      value: input?.value,
    }
  })
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  console.log(name, await probe(page, base))
  await page.close()
}
await browser.close()
