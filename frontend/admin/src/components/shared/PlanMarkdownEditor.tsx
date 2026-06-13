import { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import MdEditor from 'react-markdown-editor-lite'
import 'react-markdown-editor-lite/lib/index.css'
import { cn } from '@/lib/utils'

const mdParser = new MarkdownIt()

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** 7001 plan dialog: rc-md-editor at 300px with toolbar + edit pane. */
export function PlanMarkdownEditor({ value, onChange, placeholder, className }: Props) {
  const renderHTML = useMemo(() => (text: string) => mdParser.render(text), [])

  return (
    <div className={cn('grid grid-cols-1 gap-4', className)}>
      <MdEditor
        value={value}
        style={{ height: '287px' }}
        renderHTML={renderHTML}
        placeholder={placeholder}
        onChange={({ text }) => onChange(text)}
        view={{ menu: true, md: true, html: false }}
        className="rc-md-editor rounded-md border"
      />
    </div>
  )
}
