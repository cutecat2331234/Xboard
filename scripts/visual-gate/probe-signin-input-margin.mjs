import { chromium } from 'playwright'

for (const base of ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  const info = await page.evaluate(() => {
    const inp = document.querySelector('.rounded-xl form input#email, .rounded-xl form input[name=email]')
    const cs = inp ? getComputedStyle(inp) : null
    return {
      marginTop: cs?.marginTop,
      blockGap: getComputedStyle(inp?.parentElement).rowGap,
    }
  })
  console.log(base.includes('7001') ? '7001' : '7002', info)
  await browser.close()
}
