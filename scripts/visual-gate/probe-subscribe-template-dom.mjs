import { chromium } from 'playwright'

const SECURE = process.env.SECURE_PATH || ''
const HASH = '#/config/system/subscribe-template'

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input[name="email"], input[type="email"], input[type="text"]').first().fill('admin@example.com')
    await page.locator('input[type="password"]').first().fill('your-password')
    await page.locator('button[type="submit"], form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
  }
  await page.waitForTimeout(2000)
}

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  await page.goto(`${base}/${SECURE}${HASH}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body
    return {
      locale: localStorage.getItem('xboard_locale'),
      h3: [...document.querySelectorAll('h3')].map((e) => e.textContent?.trim()),
      monaco: document.querySelectorAll('.monaco-editor').length,
      textareas: document.querySelectorAll('textarea').length,
      tabs: document.querySelectorAll('[role=tablist] [role=tab]').length,
      tabLabels: [...document.querySelectorAll('[role=tablist] [role=tab]')].map((e) => e.textContent?.trim()),
      labels: [...document.querySelectorAll('label')].map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 15),
      mainText: main.innerText?.slice(0, 1200),
      configNavActive: document.querySelector('a[href*="subscribe-template"]')?.getAttribute('class'),
      asideIconSample: [...document.querySelectorAll('aside a svg')].slice(0, 3).map((s) => s.className?.baseVal || s.getAttribute('class')),
    }
  })
  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(data, null, 2))
  await browser.close()
}

await probe('http://127.0.0.1:7001', '7001')
await probe('http://127.0.0.1:7002', '7002')
