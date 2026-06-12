import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
    localStorage.removeItem('xboard_admin_auth_data')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const root = document.querySelector('.container') || document.body
    const card = document.querySelector('.rounded-xl.border.bg-card')
    const h1s = [...document.querySelectorAll('h1')].map((h) => ({
      text: h.textContent?.trim().slice(0, 40),
      cls: h.className,
    }))
    const cs = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      return {
        bg: s.backgroundColor,
        shadow: s.boxShadow,
        padding: s.padding,
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      }
    }
    return {
      h1s,
      root: cs(root),
      card: cs(card),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      html: document.body.innerHTML.slice(0, 800),
    }
  })
  console.log(label, JSON.stringify(info, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
