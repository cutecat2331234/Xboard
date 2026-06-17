import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function probe(base, name) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SECURE}#/user/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('tbody tr').first().locator('button').last().click()
  await page.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 15000 })

  const info = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    if (!dlg) return null
    const expireLabel = [...dlg.querySelectorAll('label')].find((l) => l.textContent?.includes('到期'))
    const field = expireLabel?.parentElement
    const expireControl = field?.querySelector('input,button,[role=button]')
    const footer = [...dlg.querySelectorAll('div')].find((d) => {
      const btns = [...d.querySelectorAll('button')].filter((b) => /提交|取消/.test(b.textContent || ''))
      return btns.length >= 2
    })
    const formRoot = dlg.querySelector('.space-y-4,.xb-stack-4,form,div.flex.flex-col') || dlg.children[1]
    const children = formRoot ? [...formRoot.children] : []
    const gaps = children.slice(0, 5).map((el, i) => {
      const cs = getComputedStyle(el)
      const prev = children[i - 1]
      const mt = cs.marginTop
      const gapFromPrev = prev
        ? el.getBoundingClientRect().top - prev.getBoundingClientRect().bottom
        : 0
      return { tag: el.tagName, className: el.className.slice(0, 80), marginTop: mt, gapFromPrev: Math.round(gapFromPrev) }
    })
    return {
      expireTag: expireControl?.tagName,
      expireClass: expireControl?.className?.slice(0, 120),
      expireType: expireControl?.getAttribute('type'),
      expireText: expireControl?.textContent?.trim().slice(0, 60),
      footerClass: footer?.className?.slice(0, 120),
      footerBorder: footer ? getComputedStyle(footer).borderTopWidth : null,
      gaps,
    }
  })
  console.log(name, JSON.stringify(info, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
