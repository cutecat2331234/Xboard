import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function probe(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => {
    const labels = ['toolbar', 'stats', 'overview', 'ranks', 'queue']
    const toolbar = document.querySelector('h1')?.getBoundingClientRect()
    const stats = document.querySelectorAll('.rounded-xl.shadow')[0]?.getBoundingClientRect()
    const overview = [...document.querySelectorAll('.rounded-xl.shadow')].find((c) =>
      /收入概览/.test(c.textContent || ''),
    )?.getBoundingClientRect()
    const ranks = [...document.querySelectorAll('h3')].find((h) => /节点流量排行/.test(h.textContent || ''))
      ?.getBoundingClientRect()
    const queue = [...document.querySelectorAll('h3')].find((h) => /队列状态/.test(h.textContent || ''))
      ?.getBoundingClientRect()
    return {
      scrollH: document.documentElement.scrollHeight,
      toolbar: toolbar ? { y: Math.round(toolbar.y), h: Math.round(toolbar.height) } : null,
      stats: stats ? { y: Math.round(stats.y), h: Math.round(stats.height) } : null,
      overview: overview ? { y: Math.round(overview.y), h: Math.round(overview.height) } : null,
      ranks: ranks ? { y: Math.round(ranks.y), h: Math.round(ranks.height) } : null,
      queue: queue ? { y: Math.round(queue.y), h: Math.round(queue.height) } : null,
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
