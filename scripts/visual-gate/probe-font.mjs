import { chromium } from 'playwright'

async function probe(base) {
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  const info = await p.evaluate(() => ({
    links: [...document.querySelectorAll('link[href*="font"], style')].map((el) =>
      el.tagName === 'LINK' ? el.href : el.textContent?.slice(0, 100),
    ),
    font: getComputedStyle(document.body).fontFamily,
  }))
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
