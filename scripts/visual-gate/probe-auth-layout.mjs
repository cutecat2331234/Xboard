import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()

for (const port of ['7001', '7002']) {
  await p.goto(`http://127.0.0.1:${port}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(2000)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    const children = card ? [...card.children].map((c) => ({
      cls: c.className?.slice?.(0, 60),
      h: Math.round(c.getBoundingClientRect().height),
      text: c.textContent?.slice(0, 80)?.replace(/\s+/g, ' '),
    })) : []
    const submit = [...document.querySelectorAll('button')].map((btn) => ({
      text: btn.textContent?.trim(),
      visible: btn.offsetParent !== null,
      cls: btn.className?.slice(0, 40),
    }))
    const footerBar = document.querySelector('.auth-card__footer-bar, .n-card__footer')
    return {
      cardChildren: children,
      buttons: submit,
      footerBar: footerBar
        ? {
            cls: footerBar.className,
            bg: getComputedStyle(footerBar).backgroundColor,
            h: Math.round(footerBar.getBoundingClientRect().height),
          }
        : null,
      langBtn: document.querySelector('.auth-lang-btn, [class*=language]')?.textContent?.trim(),
    }
  })
  console.log(`\n=== ${port} ===`, JSON.stringify(info, null, 2))
}

await b.close()
