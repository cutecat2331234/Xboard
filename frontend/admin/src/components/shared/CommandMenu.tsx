import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { COMMAND_ITEMS } from '@/lib/nav-groups'
import { useNavHighlight } from '@/lib/nav-highlight'
import { buildPluginNavGroups } from '@/lib/plugin-menus'
import { usePluginList } from '@/lib/use-plugin-list'
import { PluginMenuIcon } from '@/components/plugin/PluginMenuIcon'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { setActivePath } = useNavHighlight()
  const { t } = useTranslation()
  const { plugins } = usePluginList()
  const pluginGroups = useMemo(() => buildPluginNavGroups(plugins), [plugins])
  const pluginItems = useMemo(
    () =>
      pluginGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupTitle: group.title,
          pluginType: group.pluginType,
        })),
      ),
    [pluginGroups],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 w-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background p-0 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">{t('search.placeholder')}</span>
        <span className="sr-only">Search</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          {t('search.shortcut.key')}
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input placeholder={t('search.placeholder')} className="flex h-11 w-full bg-transparent py-3 text-sm outline-none" />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty>{t('search.noResults')}</Command.Empty>
              {COMMAND_ITEMS.map((item) => {
                const Icon = item.icon
                const label = t(item.labelKey)
                return (
                  <Command.Item
                    key={item.path}
                    value={label}
                    onSelect={() => {
                      setActivePath(item.path)
                      navigate(item.path)
                      setOpen(false)
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Command.Item>
                )
              })}
              {pluginItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.title} ${item.groupTitle} ${item.path} ${item.pluginCode}`}
                  onSelect={() => {
                    setActivePath(item.path)
                    navigate(item.path)
                    setOpen(false)
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <PluginMenuIcon icon={item.icon} pluginType={item.pluginType} className="h-4 w-4" />
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{item.groupTitle}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
