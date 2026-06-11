import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  const r = await p.evaluate(() => {
    const input = document.querySelector('.n-input')
    const btn = document.querySelector('.n-button--primary-type')
    return {
      input: input ? getComputedStyle(input).borderRadius : null,
      btn: btn ? getComputedStyle(btn).borderRadius : null,
    }
  })
  console.log(base, JSON.stringify(r))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
