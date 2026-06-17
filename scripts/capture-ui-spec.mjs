#!/usr/bin/env node
/**
 * Capture ui-spec from reference site (default 7001).
 * Usage: node scripts/capture-ui-spec.mjs [--base=http://127.0.0.1:7001] [--side=user|admin]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

const base = args.base || 'http://127.0.0.1:7001'
const side = args.side || 'user'
const securePath = args['secure-path'] || process.env.SECURE_PATH || ''
const adminEmail = args['admin-email'] || 'admin@example.com'
const adminPassword = args['admin-password'] || 'your-password'

const USER_ROUTES = [
  'login',
  'register',
  'dashboard',
  'plan',
  'order',
  'invite',
  'traffic',
  'knowledge',
  'ticket',
  'profile',
]

const ADMIN_ROUTES = [
  'sign-in',
  '',
  'config',
  'plugin',
  'theme',
  'notice',
  'payment',
  'knowledge',
  'server/manage',
  'server/machine',
  'server/group',
  'server/route',
  'plan',
  'order',
  'coupon',
  'gift-card',
  'user',
  'ticket',
  'traffic-reset',
]

const USER_ANCHORS = ['body', '#app', '.n-card', 'button', 'header', 'nav', 'main', 'h1', 'h2', 'a', 'input']
const ADMIN_ANCHORS = [
  'body',
  '#root',
  'aside',
  'header',
  'main',
  'nav',
  'table',
  '[role="dialog"]',
  '.recharts-wrapper',
  'h1',
  'h2',
  'button',
  'input',
  '[data-slot="card"]',
]

const routes = side === 'admin' ? ADMIN_ROUTES : USER_ROUTES
const viewports = [375, 768, 1280]

function slugFor(route) {
  return route === '' ? 'dashboard' : route.replace(/\//g, '_')
}

function urlFor(route) {
  if (side === 'admin') {
    const hash = route === 'sign-in' ? '#/sign-in' : `#/${route}`
    return `${base}/${securePath}${hash}`
  }
  return `${base}/#/${route}`
}

async function adminLogin(page) {
  await page.goto(`${base}/${securePath}#/sign-in`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(800)
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="example"]')
  const password = page.locator('input[type="password"]')
  if ((await email.count()) > 0) {
    await email.first().fill(adminEmail)
    await password.first().fill(adminPassword)
    const submit = page.getByRole('button', { name: /sign in|登录/i })
    if ((await submit.count()) > 0) {
      await submit.first().click()
      await page.waitForTimeout(2500)
    }
  }
}

async function main() {
  let playwright
  const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
  try {
    playwright = fs.existsSync(pwPath)
      ? await import(pathToFileURL(pwPath).href)
      : await import('playwright')
  } catch {
    console.error('Install playwright: cd scripts/visual-gate && npm i && npx playwright install chromium')
    process.exit(1)
  }

  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

  if (side === 'admin') {
    await adminLogin(page)
  }

  for (const route of routes) {
    const slug = slugFor(route)
    const dir = path.join(root, 'decompiled/ui-spec', side, slug)
    fs.mkdirSync(dir, { recursive: true })

    const url = urlFor(route)
    const errors = []
    page.removeAllListeners('console')
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    console.log('capture', url)
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
      await page.waitForTimeout(2000)

      for (const w of viewports) {
        await page.setViewportSize({ width: w, height: 900 })
        await page.waitForTimeout(400)
        await page.screenshot({ path: path.join(dir, `screenshot-${w}.png`), fullPage: true })
      }

      const anchors = side === 'admin' ? ADMIN_ANCHORS : USER_ANCHORS
      const styles = await page.evaluate((selectors) => {
        const out = {}
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          if (!el) continue
          const cs = getComputedStyle(el)
          out[sel] = {
            color: cs.color,
            backgroundColor: cs.backgroundColor,
            fontSize: cs.fontSize,
            padding: cs.padding,
            margin: cs.margin,
            borderRadius: cs.borderRadius,
            boxShadow: cs.boxShadow,
            gap: cs.gap,
            width: cs.width,
            height: cs.height,
          }
        }
        return out
      }, anchors)

      fs.writeFileSync(path.join(dir, 'computed-styles.json'), JSON.stringify({ route: slug, side, ref: base, viewports, styles }, null, 2))
      fs.writeFileSync(
        path.join(dir, 'apis.json'),
        JSON.stringify({ route: slug, url, note: 'Populate from Network tab during manual audit' }, null, 2),
      )
      fs.writeFileSync(path.join(dir, 'copy.md'), `# ${slug}\n\nCaptured from ${url}\n`)
      fs.writeFileSync(
        path.join(dir, 'tokens.json'),
        JSON.stringify(
          {
            shadow: {
              card: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12)',
              authCard: '0 2px 8px rgba(0,0,0,0.15)',
            },
            colors: { primary: '#2d6565' },
            extracted: styles,
          },
          null,
          2,
        ),
      )
      fs.writeFileSync(path.join(dir, 'console-errors.json'), JSON.stringify(errors, null, 2))
    } catch (e) {
      console.warn('failed', route, e.message)
    }
  }

  await browser.close()
  console.log('UI_SPEC_CAPTURE_DONE', side)
}

main()
