import { chromium } from 'playwright'

const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${CMP}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('xboard_admin_locale', 'zh-CN')
  localStorage.setItem('i18nextLng', 'zh-CN')
})
await page.reload()
await page.locator('input[type=password]').first().fill('Xboard@2026')
await page.locator('input[name=email],input[type=email]').first().fill('admin@xboard.local')
await page.locator('button[type=submit],form button').last().click()
await page.waitForTimeout(3000)
await page.goto(`${CMP}/${SEC}#/config/system/server`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

const data = await page.evaluate(() => {
  const main = document.querySelector('.flex-1.w-full')
  const form = main?.querySelector('.gap-4, .space-y-4')
  return {
    formCls: form?.className,
    fields: [...(form?.children || [])].map((el, i) => ({
      i,
      cls: el.className?.slice(0, 100),
      h: Math.round(el.getBoundingClientRect().height),
      text: el.textContent?.slice(0, 60).replace(/\s+/g, ' '),
    })),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
