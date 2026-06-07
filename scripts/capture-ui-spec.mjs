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

const routes = side === 'admin' ? ADMIN_ROUTES : USER_ROUTES
const viewports = [375, 768, 1280]

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

  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  for (const route of routes) {
    const slug = route || 'dashboard'
    const dir = path.join(root, 'decompiled/ui-spec', side, slug.replace(/\//g, '_'))
    fs.mkdirSync(dir, { recursive: true })

    const hash = side === 'admin' ? `#/${route}` : route === 'login' || route === 'register' ? `#/${route}` : `#/${route}`
    const url = side === 'admin' && route === 'sign-in'
      ? `${base}/#/sign-in`
      : side === 'admin'
        ? `${base}/#/${route}`
        : `${base}/#/${route}`

    console.log('capture', url)
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(1500)

      for (const w of viewports) {
        await page.setViewportSize({ width: w, height: 900 })
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(dir, `screenshot-${w}.png`), fullPage: true })
      }

      const styles = await page.evaluate(() => {
        const anchors = ['body', '#app', '.n-card', 'button', 'header', 'nav', 'main', 'h1', 'h2', 'a', 'input']
        const out = {}
        for (const sel of anchors) {
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
          }
        }
        return out
      })

      fs.writeFileSync(path.join(dir, 'computed-styles.json'), JSON.stringify(styles, null, 2))
      fs.writeFileSync(
        path.join(dir, 'apis.json'),
        JSON.stringify({ note: 'Populate from Network tab during manual audit', route, url }, null, 2),
      )
      fs.writeFileSync(path.join(dir, 'copy.md'), `# ${slug}\n\nCaptured from ${url}\n`)
      fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify({ source: url, extracted: styles['.n-card'] || styles.body }, null, 2))
      fs.writeFileSync(path.join(dir, 'console-errors.json'), JSON.stringify(errors, null, 2))
    } catch (e) {
      console.warn('failed', route, e.message)
    }
  }

  await browser.close()
  console.log('UI_SPEC_CAPTURE_DONE', side)
}

main()
