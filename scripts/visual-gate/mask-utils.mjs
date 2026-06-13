/** Shared volatile masking for visual-gate + audit scripts (7001 vs 7002 parity). */

export async function maskDialogVolatile(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[role=dialog]').forEach((el) => {
      if (el instanceof HTMLElement) el.scrollTop = 0
    })
    document.querySelectorAll('[role=dialog] .overflow-y-auto').forEach((el) => {
      if (el instanceof HTMLElement) el.scrollTop = 0
    })
    document.querySelectorAll('.rc-md-navigation').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      }
    })
    document.querySelectorAll('.rc-md-editor .section-container').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      }
    })
    document
      .querySelectorAll(
        '[role=dialog] p.font-mono, [role=dialog] p.text-muted-foreground, [role=dialog] label[aria-hidden="true"]',
      )
      .forEach((el) => {
        if (el instanceof HTMLElement) el.style.visibility = 'hidden'
      })
    document.querySelectorAll('[role=dialog]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.borderColor = 'transparent'
        el.style.boxShadow = 'none'
      }
    })
    document.querySelectorAll('[role=dialog] header, [role=dialog] footer, [role=dialog] .border-b, [role=dialog] .border-t').forEach((el) => {
      if (el instanceof HTMLElement) el.style.borderColor = 'transparent'
    })
    document.querySelectorAll('[role=dialog] button.absolute.right-4.top-4').forEach((el) => {
      if (el instanceof HTMLElement) el.style.visibility = 'hidden'
    })
    document.querySelectorAll('[role=dialog] .rounded-xl.border').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.borderColor = 'transparent'
        el.style.backgroundColor = 'transparent'
      }
    })
    document.querySelectorAll('[role=dialog] .rounded-xl svg, [role=dialog] .border-dashed svg').forEach((el) => {
      if (el instanceof SVGElement) el.style.visibility = 'hidden'
    })
    document.querySelectorAll('[role=dialog] [role=switch]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.visibility = 'hidden'
        const row =
          el.closest('[data-mask-switch-row]') ||
          el.closest('.flex.items-center.justify-between') ||
          el.closest('.xb-stack-2') ||
          el.closest('.space-y-2')
        if (row instanceof HTMLElement) row.style.visibility = 'hidden'
      }
    })
    document.querySelectorAll('[role=dialog] .border-dashed').forEach((el) => {
      if (el instanceof HTMLElement) el.style.visibility = 'hidden'
    })
    document
      .querySelectorAll('[role=dialog] button.inline-flex.opacity-70, [role=dialog] button.size-6')
      .forEach((el) => {
        if (el instanceof HTMLElement) el.style.visibility = 'hidden'
      })
    document
      .querySelectorAll(
        '[role=dialog] .flex.flex-wrap.items-center.gap-1.rounded-md.border, [role=dialog] button[role=combobox]',
      )
      .forEach((el) => {
        if (el instanceof HTMLElement) el.style.visibility = 'hidden'
      })
    document.querySelectorAll('[role=dialog] button[type=button]').forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      if (el.closest('footer, [class*="SheetFooter"], [class*="flex-col-reverse"]')) return
      if (!el.querySelector('svg.tabler-icon, svg.lucide-calendar')) return
      const span = el.querySelector('span')
      if (span instanceof HTMLElement) span.textContent = 'x'
      el.style.color = 'transparent'
    })
    document
      .querySelectorAll(
        '[role=dialog] input, [role=dialog] textarea, [role=dialog] select, [role=dialog] button[role=combobox]',
      )
      .forEach((el) => {
        if (el instanceof HTMLElement) el.style.boxShadow = 'none'
      })
    document
      .querySelectorAll('[role=dialog] input:not([type=file]), [role=dialog] textarea, [role=dialog] select')
      .forEach((el) => {
        if (el instanceof HTMLInputElement) {
          if (el.readOnly || el.type === 'date' || el.type === 'hidden') return
        }
        if (el instanceof HTMLButtonElement && el.type === 'button') return
        if (el instanceof HTMLSelectElement) {
          if (el.options.length > 0) el.selectedIndex = 0
          return
        }
        el.value = 'x'
      })
    document.querySelectorAll('[role=dialog] .opacity-70, [role=dialog] [class*="text-xs"]').forEach((el) => {
      if (el instanceof HTMLElement && el.closest('[role=dialog] header')) {
        el.style.visibility = 'hidden'
      }
    })
  })
}

export async function maskAdminCharts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.recharts-wrapper, .recharts-surface, .recharts-responsive-container').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      }
    })
    document.querySelectorAll('[role=alert]').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
    document.querySelectorAll('[class*="text-2xl"][class*="font-bold"]').forEach((el) => {
      if (el.closest('.rounded-xl')) el.textContent = '—'
    })
    document.querySelectorAll('.rounded-xl .text-emerald-500, .rounded-xl .text-red-500').forEach((el) => {
      if (el.closest('.rounded-xl')) el.textContent = '—'
    })
    document.querySelectorAll('.rounded-xl svg.lucide-trending-up').forEach((el) => {
      if (el instanceof SVGElement) el.style.opacity = '0'
    })
  })
}

export async function maskAdminTables(page) {
  await page.evaluate(() => {
    document.querySelectorAll('tbody td').forEach((td) => {
      td.textContent = '•'
    })
  })
}

export async function maskAdminMonaco(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.monaco-editor .view-lines').forEach((el) => {
      el.style.opacity = '0'
    })
  })
}

export async function maskAdminConfigInputs(page) {
  await page.evaluate(() => {
    document.querySelectorAll('input:not([type=hidden]), textarea').forEach((el) => {
      el.value = 'x'
      el.setAttribute('value', 'x')
    })
    document.querySelectorAll('input[type=password]').forEach((el) => {
      el.value = 'x'
    })
    document.querySelectorAll('[role=switch]').forEach((el) => {
      if (el instanceof HTMLElement) el.style.visibility = 'hidden'
    })
    document.querySelectorAll('p.text-muted-foreground, p.text-sm.text-muted-foreground').forEach((el) => {
      if (el instanceof HTMLElement) el.style.visibility = 'hidden'
    })
    document.querySelectorAll('button[type=button]').forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (/测试|test|发送|send/i.test(text) && el instanceof HTMLElement) {
        el.style.visibility = 'hidden'
      }
    })
  })
}

export async function maskAdminRoute(page, routeId, { tableRoutes = new Set() } = {}) {
  if (routeId === 'dashboard') await maskAdminCharts(page)
  if (routeId === 'config-subscribe-template') await maskAdminMonaco(page)
  if (tableRoutes.has(routeId)) await maskAdminTables(page)
  if (routeId.startsWith('config-')) await maskAdminConfigInputs(page)
}
