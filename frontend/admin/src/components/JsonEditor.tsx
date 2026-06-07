import { useEffect, useRef } from 'react'

type Props = {
  value: unknown
  readOnly?: boolean
  height?: string
}

export function JsonEditor({ value, readOnly = true, height = '420px' }: Props) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let editor: { dispose: () => void } | undefined
    let cancelled = false

    ;(async () => {
      const monaco = await import('monaco-editor')
      if (cancelled || !el.current) return
      editor = monaco.editor.create(el.current, {
        value: JSON.stringify(value, null, 2),
        language: 'json',
        readOnly,
        minimap: { enabled: false },
        automaticLayout: true,
        theme: 'vs',
      })
    })()

    return () => {
      cancelled = true
      editor?.dispose()
    }
  }, [value, readOnly])

  return <div ref={el} style={{ height, border: '1px solid #e5e7eb', borderRadius: 8 }} />
}
