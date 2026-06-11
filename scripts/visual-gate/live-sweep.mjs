/**
 * Live functional sweep: compare clickable UI on 7001 vs 7002 per route.
 */
import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const EMAIL = 'admin@xboard.local'
const PASS = 'Xboard@2026'

const USER_ROUTES = [
  'dashboard',
  'plan',
  'order',
  'invite',
  'node',
  'traffic',
  'knowledge',
  'ticket',
  'profile',
]

async function login(page, base) {
  await page.goto(`${base}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder*="邮箱"], input[placeholder*="Email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASS)
  await page.locator('.auth-submit, form .n-button--primary-type, button[type="submit"]').first().click()
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

async function collectClickables(page) {
  return page.evaluate(() => {
    const sel = 'button, a[href], .n-button, input[type=submit], [role=button]'
    const els = [...document.querySelectorAll(sel)]
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const st = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden'
      })
      .map((el) => {
        const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim()
        const href = el.getAttribute('href') || ''
        return `${el.tagName}:${text.slice(0, 40)}${href ? `@${href.slice(0, 30)}` : ''}`
      })
      .sort()
  })
}

async function collectSections(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].map((c) => {
      const title = c.querySelector('.n-card-header__main, .n-card-header')?.textContent?.trim()
      const btns = [...c.querySelectorAll('button, a')].filter((b) => b.offsetParent).map((b) => b.textContent?.trim()).filter(Boolean)
      return { title: title?.slice(0, 40), btns: btns.slice(0, 8) }
    })
    return cards.filter((c) => c.title || c.btns.length)
  })
}

async function sweepRoute(route) {
  const b = await chromium.launch()
  const results = {}
  for (const [label, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
    const p = await ctx.newPage()
    await login(p, base)
    await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {})
    await p.waitForTimeout(2500)
    results[label] = {
      clickables: await collectClickables(p),
      sections: await collectSections(p),
      errors: await p.evaluate(() => {
        const body = document.body.innerText
        return /502|504|错误|failed|undefined/i.test(body) ? body.slice(0, 200) : null
      }),
    }
    await ctx.close()
  }
  await b.close()

  const refSet = new Set(results['7001'].clickables)
  const cmpSet = new Set(results['7002'].clickables)
  const onlyRef = [...refSet].filter((x) => !cmpSet.has(x))
  const onlyCmp = [...cmpSet].filter((x) => !refSet.has(x))

  const refTitles = results['7001'].sections.map((s) => s.title).filter(Boolean)
  const cmpTitles = results['7002'].sections.map((s) => s.title).filter(Boolean)
  const missingTitles = refTitles.filter((t) => !cmpTitles.includes(t))
  const extraTitles = cmpTitles.filter((t) => !refTitles.includes(t))

  return { route, onlyRef, onlyCmp, missingTitles, extraTitles, errors: results }
}

const gaps = []
for (const route of USER_ROUTES) {
  console.log(`\n--- ${route} ---`)
  const r = await sweepRoute(route)
  if (r.onlyRef.length) {
    console.log('7002 missing clickables:', r.onlyRef.slice(0, 15))
    gaps.push({ route, type: 'missing_clickable', items: r.onlyRef })
  }
  if (r.onlyCmp.length) {
    console.log('7002 extra clickables:', r.onlyCmp.slice(0, 15))
  }
  if (r.missingTitles.length) {
    console.log('7002 missing sections:', r.missingTitles)
    gaps.push({ route, type: 'missing_section', items: r.missingTitles })
  }
  if (r.extraTitles.length) console.log('7002 extra sections:', r.extraTitles)
  if (!r.onlyRef.length && !r.missingTitles.length) console.log('OK')
}

console.log('\n=== GAP SUMMARY ===')
console.log(JSON.stringify(gaps, null, 2))
