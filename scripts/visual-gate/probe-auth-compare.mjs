import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()

for (const port of ['7001', '7002']) {
  const base = `http://127.0.0.1:${port}`
  for (const route of ['login', 'register']) {
    await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(2000)
    const info = await p.evaluate(() => ({
      hash: location.hash,
      title: document.querySelector('h1')?.textContent,
      footerLinks: [...document.querySelectorAll('.auth-card__footer-bar a')].map((a) => ({
        text: a.textContent?.trim(),
        href: a.getAttribute('href'),
      })),
      fields: [...document.querySelectorAll('input')].map((i) => i.placeholder || i.type),
      btnText: document.querySelector('.auth-submit, .n-button--primary-type')?.textContent?.trim(),
      cardH: Math.round(document.querySelector('.auth-card, .n-card')?.getBoundingClientRect().height ?? 0),
    }))
    console.log(`${port} ${route}:`, JSON.stringify(info, null, 2))
  }
}

await b.close()
