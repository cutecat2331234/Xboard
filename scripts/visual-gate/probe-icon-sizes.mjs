import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const menuIcon = document.querySelector('.n-menu-item-content__icon .n-icon')
    const headerIcons = [...document.querySelectorAll('header .n-icon')].map((el, i) => ({
      i,
      fontSize: getComputedStyle(el).fontSize,
      h: Math.round(el.getBoundingClientRect().height),
    }))
    const shortcutIcon = document.querySelector('.n-list-item .n-icon, .shortcut-icon')
    return {
      menuIconSize: menuIcon ? getComputedStyle(menuIcon).fontSize : null,
      headerIcons,
      shortcut: shortcutIcon
        ? {
            fontSize: getComputedStyle(shortcutIcon).fontSize,
            cls: shortcutIcon.className,
          }
        : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
