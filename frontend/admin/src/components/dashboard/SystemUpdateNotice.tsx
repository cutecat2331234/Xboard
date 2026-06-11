import { useCallback, useEffect, useState } from 'react'
import { ArrowUpCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  fetchSystemUpdateStatus,
  SYSTEM_UPDATE_DOCS_URL,
  type UpdateCheckInfo,
} from '@/lib/api'
import { getSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'xboard_admin_update_dismissed'

function isDismissed(version?: string) {
  if (!version) return false
  try {
    return localStorage.getItem(DISMISS_KEY) === version
  } catch {
    return false
  }
}

export function SystemUpdateNotice() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<UpdateCheckInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchSystemUpdateStatus()
      .then((data: UpdateCheckInfo | null) => {
        setInfo(data)
        if (data?.latest_version) {
          setDismissed(isDismissed(data.latest_version))
        }
      })
      .catch(() => setInfo(null))
  }, [])

  const dismiss = useCallback(() => {
    if (!info?.latest_version) return
    try {
      localStorage.setItem(DISMISS_KEY, info.latest_version)
    } catch {
      // ignore
    }
    setDismissed(true)
  }, [info?.latest_version])

  if (!info?.has_update || dismissed) return null

  const docsUrl = info.download_url || SYSTEM_UPDATE_DOCS_URL
  const currentVersion = info.current_version || getSettings().version || '—'
  const latestVersion = info.latest_version || '—'

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{t('common.update.newVersion')}</p>
          <p className="text-amber-900/80 dark:text-amber-100/80">{t('common.update.title')}</p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
            {t('common.update.currentVersion')}: <span className="font-mono">{currentVersion}</span>
            {' · '}
            {t('common.update.latestVersion')}: <span className="font-mono">{latestVersion}</span>
          </p>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100"
          >
            {t('common.update.updateNow')}
          </a>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
        <Button type="button" variant="outline" size="sm" onClick={dismiss}>
          {t('common.update.updateLater')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={dismiss}
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
