import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

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

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
