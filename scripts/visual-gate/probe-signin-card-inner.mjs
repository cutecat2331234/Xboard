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
    localStorage.removeItem('xboard_admin_auth_data')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const card = document.querySelector('.rounded-xl.border.bg-card')
    if (!card) return null
    const kids = [...card.children].map((el, i) => ({
      i,
      tag: el.tagName,
      cls: el.className.slice(0, 80),
      h: Math.round(el.getBoundingClientRect().height),
    }))
    const inner = card.querySelector('.flex.flex-col')
    const innerKids = inner
      ? [...inner.children].map((el, i) => ({
          i,
          tag: el.tagName,
          cls: el.className.slice(0, 80),
          h: Math.round(el.getBoundingClientRect().height),
        }))
      : []
    return { cardH: Math.round(card.getBoundingClientRect().height), kids, innerKids }
  })
  console.log(label, JSON.stringify(info, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
