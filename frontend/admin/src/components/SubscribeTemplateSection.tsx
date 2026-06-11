import { useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateMonacoEditor } from '@/components/TemplateMonacoEditor'

const TEMPLATE_KEYS = [
  { key: 'subscribe_template_singbox', tab: 'Sing-box', lang: 'json' },
  { key: 'subscribe_template_clash', tab: 'Clash', lang: 'yaml' },
  { key: 'subscribe_template_clashmeta', tab: 'Clash Meta', lang: 'yaml' },
  { key: 'subscribe_template_stash', tab: 'Stash', lang: 'yaml' },
  { key: 'subscribe_template_surge', tab: 'Surge', lang: 'ini' },
  { key: 'subscribe_template_surfboard', tab: 'Surfboard', lang: 'ini' },
] as const

const LABEL_KEYS: Record<string, string> = {
  subscribe_template_singbox: 'settings.subscribe_template.singbox',
  subscribe_template_clash: 'settings.subscribe_template.clash',
  subscribe_template_clashmeta: 'settings.subscribe_template.clashmeta',
  subscribe_template_stash: 'settings.subscribe_template.stash',
  subscribe_template_surge: 'settings.subscribe_template.surge',
  subscribe_template_surfboard: 'settings.subscribe_template.surfboard',
}

type Props = {
  t: TFunction
  tpl: Record<string, unknown>
  update: (sec: string, key: string, value: unknown) => void
}

export function SubscribeTemplateSection({ t, tpl, update }: Props) {
  useEffect(() => {
    void import('monaco-editor')
  }, [])

  const [active, setActive] = useState(TEMPLATE_KEYS[0].key)
  const current = TEMPLATE_KEYS.find((x) => x.key === active) ?? TEMPLATE_KEYS[0]
  const labelKey = LABEL_KEYS[current.key]

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="h-auto flex-wrap">
          {TEMPLATE_KEYS.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {TEMPLATE_KEYS.map((item) => (
          <TabsContent key={item.key} value={item.key} className="mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-base font-medium">{t(`${LABEL_KEYS[item.key]}.title`)}</label>
              <p className="text-[0.8rem] text-muted-foreground">{t(`${LABEL_KEYS[item.key]}.description`)}</p>
              <TemplateMonacoEditor
                value={String(tpl[item.key] ?? '')}
                language={item.lang}
                height="420px"
                onChange={(v) => update('subscribe_template', item.key, v)}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
