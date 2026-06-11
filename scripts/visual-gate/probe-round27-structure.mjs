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
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await pwd.first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

function analyze(hash) {
  return (page) =>
    page.evaluate((h) => {
      const main = document.querySelector('.flex-1.w-full') || document.querySelector('main')
      const formWrap = main?.querySelector('.space-y-4, .gap-4, [class*="gap-4"]')
      const firstSwitch = [...(main?.querySelectorAll('label') || [])].find((l) =>
        l.textContent?.includes(h.includes('invite') ? '开启强制邀请' : h.includes('safe') ? '邮箱验证' : '允许用户更改订阅'),
      )
      const swBlock = firstSwitch?.parentElement
      const swGrand = swBlock?.parentElement
      const firstInput = [...(main?.querySelectorAll('label') || [])].find((l) =>
        l.textContent?.includes(h.includes('invite') ? '邀请佣金' : h.includes('safe') ? '后台路径' : '月流量重置'),
      )
      const inBlock = firstInput?.closest('.space-y-2, .gap-2, [class*="gap-2"]')
      const combobox = main?.querySelector('[role=combobox]:not([aria-expanded])') || main?.querySelector('button[role=combobox]')
      return {
        formWrapCls: formWrap?.className,
        parentCls: formWrap?.parentElement?.className,
        switchBlock: swBlock?.className,
        switchGrand: swGrand?.className,
        switchHTML: swGrand?.outerHTML?.slice(0, 500),
        inputBlockCls: inBlock?.className,
        inputOrder: inBlock
          ? [...inBlock.children].map((c) => c.tagName + (c.matches('[role=switch]') ? ':switch' : c.matches('input') ? ':input' : c.matches('button[role=combobox]') ? ':combo' : ''))
          : [],
        comboW: combobox ? Math.round(combobox.getBoundingClientRect().width) : null,
      }
    }, hash)
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/invite']) {
  console.log(`\n######## ${hash} ########`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    console.log(name, JSON.stringify(await analyze(hash)(page), null, 2))
    await page.close()
  }
}
await browser.close()
