import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { IconChevronDown, IconMenu2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getSettings } from '@/lib/settings'
import { NAV_GROUPS } from '@/lib/nav-groups'
import { buildPluginNavGroups } from '@/lib/plugin-menus'
import { usePluginList } from '@/lib/use-plugin-list'
import { GroupIcon, NavIcon } from '@/lib/tabler-nav-icons'
import { PluginMenuIcon } from '@/components/plugin/PluginMenuIcon'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

const groupKeys = ['system', 'node', 'subscription', 'user']

const navLinkCls =
  'inline-flex h-12 w-full items-center whitespace-nowrap rounded-none px-6 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

const subLinkCls =
  'inline-flex items-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-xs justify-start text-wrap rounded-none h-10 w-full border-l border-l-slate-500 px-2'

type SidebarNavProps = {
  openGroups: Record<string, boolean>
  setOpenGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  openPluginGroups: Record<string, boolean>
  setOpenPluginGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  pluginGroups: ReturnType<typeof buildPluginNavGroups>
  onNavigate?: () => void
}

function SidebarNav({
  openGroups,
  setOpenGroups,
  openPluginGroups,
  setOpenPluginGroups,
  pluginGroups,
  onNavigate,
}: SidebarNavProps) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav className="grid flex-1 gap-1 overflow-auto overscroll-contain py-2">
      {NAV_GROUPS.map((group, gi) => {
        const groupKey = groupKeys[gi - 1]
        const isDashboardOnly = !group.labelKey

        if (isDashboardOnly) {
          return group.items.map((item) => {
            const active = item.end
              ? location.pathname === '/' || location.pathname === ''
              : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onNavigate}
                className={cn(
                  navLinkCls,
                  active
                    ? 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <div className="mr-2">
                  <NavIcon path={item.path} className="h-[18px] w-[18px]" />
                </div>
                {t(item.labelKey)}
              </NavLink>
            )
          })
        }

        const open = openGroups[groupKey] ?? true
        return (
          <Collapsible
            key={group.labelKey}
            open={open}
            onOpenChange={(v) => setOpenGroups((s) => ({ ...s, [groupKey]: v }))}
          >
            <CollapsibleTrigger
              className={cn(
                navLinkCls,
                'group justify-start hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <div className="mr-2">
                <GroupIcon labelKey={group.labelKey!} className="h-[18px] w-[18px]" />
              </div>
              {t(group.labelKey!)}
              <IconChevronDown
                className={cn('tabler-icon tabler-icon-chevron-down ml-auto h-4 w-4 transition-transform', open && '-rotate-180')}
                stroke={2}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul>
                {group.items.map((item) => {
                  return (
                    <li key={item.path} className="my-1 ml-8">
                      <NavLink
                        to={item.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            subLinkCls,
                            isActive
                              ? 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'
                              : 'hover:bg-accent hover:text-accent-foreground',
                          )
                        }
                      >
                        <div className="mr-2">
                          <NavIcon path={item.path} className="h-[18px] w-[18px]" />
                        </div>
                        {t(item.labelKey)}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
      {pluginGroups.map((group) => {
        const open = openPluginGroups[group.id] ?? true
        return (
          <Collapsible
            key={group.id}
            open={open}
            onOpenChange={(v) => setOpenPluginGroups((s) => ({ ...s, [group.id]: v }))}
          >
            <CollapsibleTrigger
              className={cn(
                navLinkCls,
                'group justify-start hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <div className="mr-2">
                <PluginMenuIcon pluginType={group.pluginType} />
              </div>
              <span className="truncate">{group.title}</span>
              {group.label ? (
                <span className="ml-2 rounded-lg bg-primary px-1 text-[0.625rem] text-primary-foreground">
                  {group.label}
                </span>
              ) : null}
              <IconChevronDown
                className={cn(
                  'tabler-icon tabler-icon-chevron-down ml-auto h-4 w-4 shrink-0 transition-transform',
                  open && '-rotate-180',
                )}
                stroke={2}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id} className="my-1 ml-8">
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          subLinkCls,
                          isActive
                            ? 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'
                            : 'hover:bg-accent hover:text-accent-foreground',
                        )
                      }
                    >
                      <div className="mr-2">
                        <PluginMenuIcon icon={item.icon} pluginType={group.pluginType} />
                      </div>
                      <span className="truncate">{item.title}</span>
                      {item.label ? (
                        <span className="ml-2 rounded-lg bg-primary px-1 text-[0.625rem] text-primary-foreground">
                          {item.label}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const { title, logo, version } = getSettings()
  const { plugins } = usePluginList()
  const pluginGroups = useMemo(() => buildPluginNavGroups(plugins), [plugins])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    system: true,
    node: true,
    subscription: true,
    user: true,
  })
  const [openPluginGroups, setOpenPluginGroups] = useState<Record<string, boolean>>({})

  return (
    <aside className="fixed left-0 right-0 top-0 z-50 flex h-auto flex-col border-r-2 border-r-muted transition-[width] md:bottom-0 md:right-auto md:h-svh md:w-64">
      <div className="relative flex h-full w-full flex-col">
        <div className="sticky top-0 flex h-[var(--header-height)] flex-none items-center justify-between gap-4 bg-background px-4 py-3 shadow">
          <button
            type="button"
            className="shrink-0 rounded-sm p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-label="Open navigation menu"
          >
            <IconMenu2 className="tabler-icon tabler-icon-menu-2 h-5 w-5" stroke={2} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={title} className="h-8 w-8 rounded-md object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-8 w-8">
                <rect width="256" height="256" fill="none" />
                <line x1="208" y1="128" x2="128" y2="208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="192" y1="40" x2="40" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              </svg>
            )}
            <div className="flex w-auto flex-col justify-end truncate">
              <span className="font-medium">{title || 'XBoard'}</span>
            </div>
          </div>
        </div>

        <div className="group hidden min-h-0 flex-1 flex-col overflow-hidden border-b bg-background md:flex md:border-none">
          <SidebarNav
            openGroups={openGroups}
            setOpenGroups={setOpenGroups}
            openPluginGroups={openPluginGroups}
            setOpenPluginGroups={setOpenPluginGroups}
            pluginGroups={pluginGroups}
          />
        </div>
        {version ? (
          <div className="border-t border-border/50 bg-background px-4 py-2.5 text-xs text-muted-foreground hidden md:block text-left">
            <div className="flex items-center gap-1.5 justify-start">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="whitespace-nowrap tracking-wide transition-opacity duration-200">
                v{version}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 flex-col gap-0 p-0 sm:max-w-xs">
          <SheetTitle className="sr-only">{title || 'XBoard'}</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-10">
            <SidebarNav
              openGroups={openGroups}
              setOpenGroups={setOpenGroups}
              openPluginGroups={openPluginGroups}
              setOpenPluginGroups={setOpenPluginGroups}
              pluginGroups={pluginGroups}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  )
}
