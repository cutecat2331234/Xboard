import { useEffect, useRef } from 'react'
import type { editor } from 'monaco-editor'

type Props = {
  value: string
  language?: string
  height?: string
  readOnly?: boolean
  onChange?: (value: string) => void
}

export function TemplateMonacoEditor({
  value,
  language = 'json',
  height = '420px',
  readOnly = false,
  onChange,
}: Props) {
  const el = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let disposed = false
    let sub: { dispose: () => void } | undefined

    ;(async () => {
      const monaco = await import('monaco-editor')
      if (disposed || !el.current) return

      const ed = monaco.editor.create(el.current, {
        value: value ?? '',
        language,
        readOnly,
        minimap: { enabled: false },
        automaticLayout: true,
        theme: 'vs',
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
      })
      editorRef.current = ed

      sub = ed.onDidChangeModelContent(() => {
        onChangeRef.current?.(ed.getValue())
      })
    })()

    return () => {
      disposed = true
      sub?.dispose()
      editorRef.current?.dispose()
      editorRef.current = null
    }
  }, [])

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    if (ed.getValue() !== value) {
      ed.setValue(value ?? '')
    }
  }, [value])

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    const model = ed.getModel()
    if (!model) return
    import('monaco-editor').then((monaco) => {
      monaco.editor.setModelLanguage(model, language)
    })
  }, [language])

  return (
    <div
      ref={el}
      className="overflow-hidden rounded-md border border-input"
      style={{ height }}
    />
  )
}
