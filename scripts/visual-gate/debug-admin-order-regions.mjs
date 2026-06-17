import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

const regions = [
  { name: 'sidebar', x: 0, y: 0, w: 256, h: 900 },
  { name: 'header', x: 256, y: 0, w: 1024, h: 64 },
  { name: 'title', x: 256, y: 64, w: 1024, h: 100 },
  { name: 'toolbar', x: 256, y: 164, w: 1024, h: 50 },
  { name: 'table', x: 256, y: 213, w: 1024, h: 450 },
  { name: 'pagination', x: 256, y: 660, w: 1024, h: 80 },
]

async function shot(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`)
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/${securePath}#/finance/order`)
  await page.waitForTimeout(5000)
  const buf = await page.screenshot()
  await browser.close()
  return PNG.sync.read(buf)
}

const ref = await shot('http://127.0.0.1:7001')
const cmp = await shot('http://127.0.0.1:7002')

for (const r of regions) {
  const diff = new PNG({ width: r.w, height: r.h })
  let n = 0
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const ri = ((r.y + y) * ref.width + (r.x + x)) << 2
      const ci = ((r.y + y) * cmp.width + (r.x + x)) << 2
      const dr = ref.data[ri]
      const dg = ref.data[ri + 1]
      const db = ref.data[ri + 2]
      const da = ref.data[ri + 3]
      const cr = cmp.data[ci]
      const cg = cmp.data[ci + 1]
      const cb = cmp.data[ci + 2]
      const ca = cmp.data[ci + 3]
      if (pixelmatch(Buffer.from([dr, dg, db, da]), Buffer.from([cr, cg, cb, ca]), null, 1, 1, { threshold: 0.15 })) {
        n++
        const di = (y * r.w + x) << 2
        diff.data[di] = 255
        diff.data[di + 1] = 0
        diff.data[di + 2] = 0
        diff.data[di + 3] = 255
      }
    }
  }
  const pct = ((n / (r.w * r.h)) * 100).toFixed(3)
  console.log(`${r.name}: ${pct}% (${n}/${r.w * r.h})`)
}
