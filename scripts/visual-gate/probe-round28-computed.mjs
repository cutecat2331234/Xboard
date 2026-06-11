/**
 * Round 28: computed style diff for config field blocks (7001 vs 7002).
 */
import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

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

function probe(labelText) {
  return (lt) => {
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent?.includes(lt))
    const block = label?.closest('.space-y-2')
    if (!block) return { error: 'no block', labelText: lt }
    const desc = block.querySelector('p.text-muted-foreground, p.text-\\[0\\.8rem\\]')
    const labelCs = label ? getComputedStyle(label) : null
    const descCs = desc ? getComputedStyle(desc) : null
    const blockCs = getComputedStyle(block)
    return {
      blockH: Math.round(block.getBoundingClientRect().height),
      blockGap: blockCs.rowGap,
      labelLH: labelCs?.lineHeight,
      labelFS: labelCs?.fontSize,
      labelMB: labelCs?.marginBottom,
      descLH: descCs?.lineHeight,
      descFS: descCs?.fontSize,
      descMT: descCs?.marginTop,
      descMB: descCs?.marginBottom,
    }
  }
}

const browser = await chromium.launch()
const cases = [
  ['safe', '#/config/system/safe', '邮箱验证'],
  ['safe-input', '#/config/system/safe', '后台路径'],
  ['subscribe-sw', '#/config/system/subscribe', '允许用户更改订阅'],
  ['subscribe-select', '#/config/system/subscribe', '月流量重置方式'],
  ['invite', '#/config/system/invite', '开启强制邀请'],
  ['invite-input', '#/config/system/invite', '邀请佣金'],
]

for (const [id, hash, label] of cases) {
  console.log(`\n=== ${id} (${label}) ===`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    console.log(name, await page.evaluate(probe(label), label))
    await page.close()
  }
}
await browser.close()
