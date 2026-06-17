import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
}

async function metrics(page, base, hash) {
  await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  return page.evaluate(() => {
    const clip = { x: 256, y: 64, width: 1024, height: 656 }
    const inClip = (el) => {
      const r = el.getBoundingClientRect()
      return r.top >= clip.y && r.left >= clip.x && r.bottom <= clip.y + clip.height
    }
    const blocks = [...document.querySelectorAll('.space-y-2')].filter((b) => {
      const label = b.querySelector('label.font-medium, label.text-base')
      return label && inClip(label)
    })
    return blocks.slice(0, 5).map((b) => {
      const label = b.querySelector('label')
      const sw = b.querySelector('[role=switch]')
      const cb = b.querySelector('[role=combobox]')
      const cs = sw ? getComputedStyle(sw) : cb ? getComputedStyle(cb) : null
      return {
        label: label?.textContent?.trim().slice(0, 20),
        blockH: Math.round(b.getBoundingClientRect().height),
        blockY: Math.round(b.getBoundingClientRect().y),
        ctrlH: sw || cb ? Math.round((sw || cb).getBoundingClientRect().height) : null,
        ctrlW: cb ? Math.round(cb.getBoundingClientRect().width) : null,
        gap: getComputedStyle(b).rowGap || getComputedStyle(b).gap,
      }
    })
  })
}

const browser = await chromium.launch()
for (const hash of ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/invite']) {
  console.log(`\n=== ${hash} ===`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    console.log(name, await metrics(page, base, hash))
    await page.close()
  }
}
await browser.close()
