import { chromium } from 'playwright'

for (const base of ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  const info = await page.evaluate(() => {
    const block = document.querySelector('.rounded-xl form > div > div.space-y-2')
    const lbl = block?.querySelector('label')
    const inp = block?.querySelector('input')
    return {
      blockH: block ? Math.round(block.getBoundingClientRect().height) : null,
      labelH: lbl ? Math.round(lbl.getBoundingClientRect().height) : null,
      inputH: inp ? Math.round(inp.getBoundingClientRect().height) : null,
      labelLH: lbl ? getComputedStyle(lbl).lineHeight : null,
    }
  })
  console.log(base.includes('7001') ? '7001' : '7002', info)
  await browser.close()
}
