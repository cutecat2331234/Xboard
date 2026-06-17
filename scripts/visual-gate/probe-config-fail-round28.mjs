/**
 * Deep DOM/computed-style probe for failing config pages (7001 vs 7002).
 */
import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

const PAGES = [
  { hash: '#/config/system/safe', label: '邮箱验证', type: 'switch' },
  { hash: '#/config/system/subscribe', label: '允许用户更改订阅', type: 'switch' },
  { hash: '#/config/system/invite', label: '开启强制邀请', type: 'switch' },
  { hash: '#/config/system/server', label: '通讯密钥', type: 'input' },
  { hash: '#/config/system/telegram', label: 'Bot Token', type: 'input' },
]

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
  await page.waitForTimeout(2000)
}

function probePage(label, type) {
  return (page) =>
    page.evaluate(
      ({ label, type }) => {
        const main = document.querySelector('.flex-1.w-full') || document.querySelector('main')
        const formWrap =
          main?.querySelector('.gap-4') ||
          main?.querySelector('.space-y-4') ||
          main?.querySelector('[class*="gap-4"]')
        const cs = (el) => {
          if (!el) return null
          const s = getComputedStyle(el)
          return {
            display: s.display,
            flexDirection: s.flexDirection,
            gap: s.gap,
            rowGap: s.rowGap,
            marginTop: s.marginTop,
            marginBottom: s.marginBottom,
            paddingTop: s.paddingTop,
            paddingBottom: s.paddingBottom,
            lineHeight: s.lineHeight,
            fontSize: s.fontSize,
            height: Math.round(el.getBoundingClientRect().height),
          }
        }
        const labels = [...(main?.querySelectorAll('label') || [])]
        const target = labels.find((l) => l.textContent?.trim().includes(label))
        const block = target?.closest('.gap-2, .space-y-2, [class*="gap-2"], [class*="space-y-2"]')
        const inner = block?.querySelector('.gap-0\\.5, .space-y-0\\.5, [class*="gap-0.5"], [class*="space-y-0.5"]')
        const switchEl = block?.querySelector('[role=switch]')
        const inputEl = block?.querySelector('input:not([type=hidden])')
        const desc = block?.querySelector('p.text-\\[0\\.8rem\\], p.text-sm, .text-muted-foreground')
        const allBlocks = [...(formWrap?.children || [])].map((el, i) => ({
          i,
          cls: el.className?.slice(0, 80),
          h: Math.round(el.getBoundingClientRect().height),
          childCount: el.children.length,
        }))
        return {
          formWrapCls: formWrap?.className,
          formWrapGap: cs(formWrap)?.gap,
          formWrapRowGap: cs(formWrap)?.rowGap,
          blockCount: formWrap?.children?.length,
          blockHeights: allBlocks.slice(0, 12),
          fieldBlockCls: block?.className,
          fieldBlockH: block ? Math.round(block.getBoundingClientRect().height) : null,
          innerCls: inner?.className,
          innerGap: cs(inner)?.gap,
          childOrder: block
            ? [...block.children].map((c) => {
                const tag = c.tagName.toLowerCase()
                const role = c.getAttribute('role')
                const cls = c.className?.toString().slice(0, 60)
                return `${tag}${role ? `[${role}]` : ''}:${cls}`
              })
            : [],
          labelCs: cs(target),
          descCs: cs(desc),
          switchCs: cs(switchEl),
          inputCs: cs(inputEl),
          switchHTML: block?.outerHTML?.slice(0, 600),
        }
      },
      { label, type },
    )
}

const browser = await chromium.launch()
for (const { hash, label, type } of PAGES) {
  console.log(`\n######## ${hash} (anchor: ${label}) ########`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    await page.waitForSelector('h3.text-lg', { timeout: 20000 }).catch(() => {})
    const data = await probePage(label, type)(page)
    console.log(`\n--- ${name} ---`)
    console.log(JSON.stringify(data, null, 2))
    await page.close()
  }
}
await browser.close()
