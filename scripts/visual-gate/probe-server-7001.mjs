import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const SEC = ''

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${REF}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('xboard_admin_locale', 'zh-CN')
  localStorage.setItem('i18nextLng', 'zh-CN')
})
await page.reload()
await page.locator('input[type=password]').first().fill('your-password')
await page.locator('input[name=email],input[type=email]').first().fill('admin@example.com')
await page.locator('button[type=submit],form button').last().click()
await page.waitForTimeout(3000)
await page.goto(`${REF}/${SEC}#/config/system/server`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

const data = await page.evaluate(() => {
  const main = document.querySelector('.flex-1.w-full')
  const form = main?.querySelector('.space-y-4')
  return {
    fields: [...(form?.children || [])].map((el, i) => ({
      i,
      cls: el.className?.slice(0, 100),
      h: Math.round(el.getBoundingClientRect().height),
      text: el.textContent?.slice(0, 60).replace(/\s+/g, ' '),
      html: el.outerHTML?.slice(0, 200),
    })),
  }
})
console.log(JSON.stringify(data, null, 2))
const tokenHtml = await page.evaluate(() => document.querySelector('.space-y-4')?.children[0]?.outerHTML)
console.log('\nTOKEN HTML:\n', tokenHtml?.slice(0, 2000))
await browser.close()
