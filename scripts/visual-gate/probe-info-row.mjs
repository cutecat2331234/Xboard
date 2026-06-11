import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

async function probe(port) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(`http://43.248.77.134:${port}/#/login`, { waitUntil: 'networkidle' })
  await p.locator('input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
  await p.locator('input[type="password"]').first().fill('Xboard@2026')
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(2000)
  const tn = await p.evaluate(async () => {
    const h = { Authorization: localStorage.getItem('xboard_auth_data') }
    const j = await fetch('/api/v1/user/order/fetch', { headers: h }).then((r) => r.json())
    return j.data?.find((o) => o.status === 0)?.trade_no
  })
  await p.goto(`http://43.248.77.134:${port}/#/order/${tn}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(4000)
  const d = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.info-row')].slice(0, 3).map((el) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        h: Math.round(r.height),
        p: s.padding,
        lh: s.lineHeight,
        fs: s.fontSize,
      }
    })
    const cnt = document.querySelector('.n-card .n-card__content, .n-card .n-card-content')
    const cs = cnt ? getComputedStyle(cnt) : null
    const cr = cnt?.getBoundingClientRect()
    return {
      rows,
      cnt: cnt ? { h: Math.round(cr.height), p: cs.padding } : null,
    }
  })
  console.log(port, JSON.stringify(d, null, 2))
  await b.close()
}

await probe(7001)
await probe(7002)
