#!/usr/bin/env node
import { chromium } from 'playwright'

const bases = ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']
const url = (b) => `${b}/d7f5c92b#/sign-in`

function pick(el) {
  if (!el) return null
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    tag: el.tagName,
    cls: String(el.className || '').slice(0, 100),
    w: Math.round(r.width),
    h: Math.round(r.height),
    x: Math.round(r.x),
    y: Math.round(r.y),
    fs: s.fontSize,
    fw: s.fontWeight,
    lh: s.lineHeight,
    mt: s.marginTop,
    mb: s.marginBottom,
    pt: s.paddingTop,
    pb: s.paddingBottom,
    pl: s.paddingLeft,
    pr: s.paddingRight,
    bg: s.backgroundColor,
    color: s.color,
    br: s.borderRadius,
    gap: s.gap,
  }
}

const browser = await chromium.launch()
for (const base of bases) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
    localStorage.removeItem('xboard_admin_auth_data')
  })
  const page = await ctx.newPage()
  await page.goto(url(base), { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(2000)
  const data = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 100),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        fs: s.fontSize,
        fw: s.fontWeight,
        lh: s.lineHeight,
        mt: s.marginTop,
        mb: s.marginBottom,
        pt: s.paddingTop,
        pb: s.paddingBottom,
        pl: s.paddingLeft,
        pr: s.paddingRight,
        bg: s.backgroundColor,
        color: s.color,
        br: s.borderRadius,
        gap: s.gap,
      }
    }
    const form = document.querySelector('form')
    const submit = document.querySelector('button[type=submit]')
    const emailInput = document.querySelector('input[name=email], input[type=email]')
    const labels = [...document.querySelectorAll('label')]
    const forgot = [...document.querySelectorAll('button, a')].find((e) => /forgot/i.test(e.textContent || ''))
    const h1s = [...document.querySelectorAll('h1')]
    const card = form?.closest('[data-slot=card]') || form?.parentElement?.parentElement
    const cardHeader = card?.querySelector('[data-slot=card-header]') || card?.firstElementChild
    const cardContent = card?.querySelector('[data-slot=card-content]') || card?.lastElementChild
    const langBtn = [...document.querySelectorAll('button')].find((b) => /EN|中文|RU/.test(b.textContent || ''))
    return {
      h1s: h1s.map(pick),
      card: pick(card),
      cardHeader: pick(cardHeader),
      cardContent: pick(cardContent),
      form: pick(form),
      labels: labels.map(pick),
      emailInput: pick(emailInput),
      submit: pick(submit),
      forgot: pick(forgot),
      langBtn: pick(langBtn),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      pageH: document.documentElement.scrollHeight,
    }
  })
  console.log('===', base, '===')
  console.log(JSON.stringify(data, null, 2))
  await ctx.close()
}
await browser.close()
