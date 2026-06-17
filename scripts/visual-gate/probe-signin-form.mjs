import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const info = await page.evaluate(() => {
    const form = document.querySelector('.rounded-xl form')
    if (!form) return null
    return {
      formH: Math.round(form.getBoundingClientRect().height),
      formCls: form.className,
      kids: [...form.children].map((el) => ({
        tag: el.tagName,
        cls: el.className.slice(0, 60),
        h: Math.round(el.getBoundingClientRect().height),
      })),
    }
  })
  console.log(label, JSON.stringify(info, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
