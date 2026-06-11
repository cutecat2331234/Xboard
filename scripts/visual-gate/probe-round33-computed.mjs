/**
 * Compare computed styles of key controls in user-edit sheet (7001 vs 7002).
 */
import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = ''

async function login(page, base, attempt = 1) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com', { timeout: 15000 })
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  } else if (attempt < 3) {
    await page.waitForTimeout(2000)
    return login(page, base, attempt + 1)
  }
}

function pick(cs) {
  return {
    h: cs.height,
    padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    border: cs.border,
    borderRadius: cs.borderRadius,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    boxShadow: cs.boxShadow?.slice(0, 40),
    bg: cs.backgroundColor,
  }
}

async function probe(base, name) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await login(page, base)
    await page.goto(`${base}/${SECURE}#/user/manage`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector('tbody tr', { timeout: 45000 })
    await page.locator('tbody tr').first().locator('button').last().click({ timeout: 15000 })
    await page.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click({ timeout: 15000 })
    await page.waitForSelector('[role=dialog]', { timeout: 15000 })

    const data = await page.evaluate(() => {
      const dlg = document.querySelector('[role=dialog]')
      if (!dlg) return null
      const firstInput = dlg.querySelector('input:not([type=hidden])')
      const firstSelect = dlg.querySelector('select')
      const expireBtn = [...dlg.querySelectorAll('button')].find((b) =>
        (b.textContent || '').includes('到期') || (b.textContent || '').includes('请选择用户'),
      )
      const suffix = dlg.querySelector('span.inline-flex, [class*="suffix"]')
      const submit = [...dlg.querySelectorAll('button')].find((b) => b.textContent?.trim() === '提交')
      const close = dlg.querySelector('button[class*="absolute"], [data-radix-dialog-close]')
      const pick = (el) => {
        if (!el) return null
        const cs = getComputedStyle(el)
        return {
          tag: el.tagName,
          className: el.className?.slice?.(0, 100) || '',
          h: cs.height,
          padding: `${cs.paddingTop} ${cs.paddingRight}`,
          border: cs.border,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          bg: cs.backgroundColor,
        }
      }
      return {
        input: pick(firstInput),
        select: pick(firstSelect),
        expireBtn: pick(expireBtn),
        suffix: pick(suffix),
        submit: pick(submit),
        close: pick(close),
      }
    })
    console.log(`\n### ${name}`)
    console.log(JSON.stringify(data, null, 2))
  } catch (e) {
    console.log(name, 'ERROR', e.message)
  }
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
