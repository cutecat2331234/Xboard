import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const email = 'admin@xboard.local'
const password = 'Xboard@2026'

async function probe(port, tag) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(`http://43.248.77.134:${port}/#/login`, { waitUntil: 'networkidle' })
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(password)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(2000)
  const tn = process.env.TRADE_NO || (await p.evaluate(async () => {
    const h = { Authorization: localStorage.getItem('xboard_auth_data') }
    const j = await fetch('/api/v1/user/order/fetch', { headers: h }).then((r) => r.json())
    return j.data?.find((o) => o.status === 0)?.trade_no
  }))
  await p.goto(`http://43.248.77.134:${port}/#/order/${tn}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(4000)
  const d = await p.evaluate(() => {
    const card = document.querySelectorAll('.n-card')[0]
    const hdr = card?.querySelector('.n-card-header, .n-card__header')
    const cnt = card?.querySelector('.n-card__content, .n-card-content')
    const rows = [...(card?.querySelectorAll('.info-row') || [])]
    const cs = (el) => (el ? getComputedStyle(el) : null)
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      hdr: hdr
        ? {
            h: Math.round(hdr.getBoundingClientRect().height),
            p: cs(hdr).padding,
            fs: cs(hdr).fontSize,
          }
        : null,
      cnt: cnt
        ? {
            h: Math.round(cnt.getBoundingClientRect().height),
            p: cs(cnt).padding,
          }
        : null,
      rows: rows.map((r) => ({
        h: Math.round(r.getBoundingClientRect().height),
        p: cs(r).padding,
        fs: cs(r).fontSize,
      })),
    }
  })
  console.log(tag, JSON.stringify(d, null, 2))
  await b.close()
}

await probe(7001, '7001')
await probe(7002, '7002')
