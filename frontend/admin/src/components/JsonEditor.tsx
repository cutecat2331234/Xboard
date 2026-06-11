import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type Props = {
  value: unknown
  readOnly?: boolean
  height?: string
}

export type JsonEditorHandle = {
  getValue: () => string
}

export const JsonEditor = forwardRef<JsonEditorHandle, Props>(function JsonEditor(
  { value, readOnly = true, height = '420px' },
  ref,
) {
  const el = useRef<HTMLDivElement>(null)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? JSON.stringify(value, null, 2),
  }))

  useEffect(() => {
    let editor: import('monaco-editor').editor.IStandaloneCodeEditor | undefined
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
      editorRef.current = editor
    })()

    return () => {
      cancelled = true
      editor?.dispose()
      editorRef.current = null
    }
  }, [value, readOnly])

  return <div ref={el} style={{ height, border: '1px solid #e5e7eb', borderRadius: 8 }} />
})
