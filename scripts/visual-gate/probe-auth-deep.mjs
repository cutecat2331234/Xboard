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
    const info = await p.evaluate(() => {
      const inputs = [...document.querySelectorAll('input')].map((i) => {
        const r = i.getBoundingClientRect()
        const st = getComputedStyle(i.closest('.auth-field, .n-form-item, div') || i)
        return {
          ph: i.placeholder,
          visible: r.height > 0 && r.width > 0 && st.display !== 'none' && st.visibility !== 'hidden',
          h: Math.round(r.height),
        }
      })
      const footer = document.querySelector('.auth-card__footer-bar')
      const tabs = [...document.querySelectorAll('[role=tab], .n-tabs-tab, .auth-tab')].map((t) => t.textContent?.trim())
      const links = [...document.querySelectorAll('a')].map((a) => ({
        text: a.textContent?.trim(),
        href: a.getAttribute('href'),
        visible: a.offsetParent !== null,
      }))
      return {
        hash: location.hash,
        tabs,
        inputs,
        footerVisible: footer ? footer.offsetParent !== null : false,
        footerHTML: footer?.innerHTML?.slice(0, 200),
        links: links.filter((l) => l.text),
        primaryBtn: document.querySelector('.auth-submit, .n-button--primary-type')?.textContent?.trim(),
      }
    })
    console.log(`\n=== ${port} ${route} ===`)
    console.log(JSON.stringify(info, null, 2))
  }
}

await b.close()
