import { useCallback, useRef } from 'react'

/**
 * In-flight guard for money/state-changing actions.
 *
 * Returns a `run(key, fn)` helper that synchronously drops re-entrant calls
 * sharing the same key while an earlier call is still pending. This prevents
 * double-click / rapid-fire duplicate submissions (approve withdrawal, assign
 * balance, delete, per-row toggles) without needing to thread a `disabled`
 * flag through every control.
 *
 * The key disambiguates concurrent rows, e.g. `delete:${id}` or `toggle:${id}`,
 * so distinct rows are not blocked by one another.
 */
export function useInFlightGuard() {
  const inFlight = useRef<Set<string>>(new Set())

  const run = useCallback(
    async <T>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
      if (inFlight.current.has(key)) return undefined
      inFlight.current.add(key)
      try {
        return await fn()
      } finally {
        inFlight.current.delete(key)
      }
    },
    [],
  )

  return run
}
