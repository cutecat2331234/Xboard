import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
  await page.locator('input[type=password]').first().fill('Xboard@2026')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function dash(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.rounded-xl.shadow')]
    const overview = cards[4] // typically 5th card after 4 stat cards
    const allTitles = cards.map((c) => c.querySelector('h3')?.textContent?.trim())
    return {
      cardCount: cards.length,
      titles: allTitles,
      overviewHeader: overview?.innerHTML?.slice(0, 1500),
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await dash(REF, '7001')
await dash(CMP, '7002')
