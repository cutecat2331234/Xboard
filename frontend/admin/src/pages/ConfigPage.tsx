import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconBuilding, IconRefresh } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchConfig, fetchJsonList, saveConfig } from '@/lib/api'
import { configFieldLabelCls, configSubFieldLabelCls, inputCls } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { ConfigFormSelect } from '@/components/shared/ConfigFormSelect'
import { ConfigSectionFields } from '@/pages/config-section-fields'

const SECTIONS = [
  { id: 'site', labelKey: 'settings.site.title', descKey: 'settings.site.description', icon: 'building' },
  { id: 'safe', labelKey: 'settings.safe.title', descKey: 'settings.safe.description', icon: 'lock' },
  { id: 'subscribe', labelKey: 'settings.subscribe.title', descKey: 'settings.subscribe.description', icon: 'ticket' },
  { id: 'invite', labelKey: 'settings.invite.title', descKey: 'settings.invite.description', icon: 'user-circle' },
  { id: 'server', labelKey: 'settings.server.title', descKey: 'settings.server.description', icon: 'server' },
  { id: 'email', labelKey: 'settings.email.title', descKey: 'settings.email.description', icon: 'mail' },
  { id: 'telegram', labelKey: 'settings.telegram.title', descKey: 'settings.telegram.description', icon: 'telegram' },
  { id: 'app', labelKey: 'settings.app.title', descKey: 'settings.app.description', icon: 'adjustments' },
  {
    id: 'subscribe_template',
    labelKey: 'settings.subscribe_template.title',
    descKey: 'settings.subscribe_template.description',
    icon: 'template',
  },
] as const

function ConfigNavIcon({ name }: { name: string }) {
  const cls = 'tabler-icon tabler-icon-' + name
  const props = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cls,
  }
  switch (name) {
    case 'building':
      return (
        <svg {...props}>
          <path d="M3 21l18 0" />
          <path d="M9 8l1 0" />
          <path d="M9 12l1 0" />
          <path d="M9 16l1 0" />
          <path d="M14 8l1 0" />
          <path d="M14 12l1 0" />
          <path d="M14 16l1 0" />
          <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...props}>
          <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
          <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
          <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
        </svg>
      )
    case 'ticket':
      return (
        <svg {...props}>
          <path d="M15 5l0 2" />
          <path d="M15 11l0 2" />
          <path d="M15 17l0 2" />
          <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />
        </svg>
      )
    case 'user-circle':
      return (
        <svg {...props}>
          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
        </svg>
      )
    case 'server':
      return (
        <svg {...props}>
          <path d="M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z" />
          <path d="M3 12m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z" />
          <path d="M7 8l0 .01" />
          <path d="M7 16l0 .01" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...props}>
          <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
          <path d="M3 7l9 6l9 -6" />
        </svg>
      )
    case 'telegram':
      return (
        <svg {...props} className="tabler-icon tabler-icon-brand-telegram">
          <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
        </svg>
      )
    case 'adjustments':
      return (
        <svg {...props}>
          <path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
          <path d="M6 4v4" />
          <path d="M6 12v8" />
          <path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
          <path d="M12 4v10" />
          <path d="M12 18v2" />
          <path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
          <path d="M18 4v1" />
          <path d="M18 9v11" />
        </svg>
      )
    case 'template':
      return (
        <svg {...props}>
          <path d="M4 4m0 1a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1z" />
          <path d="M4 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
          <path d="M14 12l6 0" />
          <path d="M14 16l6 0" />
          <path d="M14 20l6 0" />
        </svg>
      )
    default:
      return <IconBuilding size={18} stroke={2} />
  }
}

type SectionId = (typeof SECTIONS)[number]['id']

const PATH_TO_SECTION: Record<string, SectionId> = {
  '': 'site',
  site: 'site',
  safe: 'safe',
  subscribe: 'subscribe',
  invite: 'invite',
  server: 'server',
  email: 'email',
  telegram: 'telegram',
  app: 'app',
  'subscribe-template': 'subscribe_template',
}

function sectionToPath(id: SectionId): string {
  if (id === 'site') return '/config/system'
  if (id === 'subscribe_template') return '/config/system/subscribe-template'
  return `/config/system/${id}`
}

function pathToSection(pathname: string): SectionId {
  const sub = pathname.replace(/^\/?config\/system\/?/, '').replace(/^\//, '')
  return PATH_TO_SECTION[sub] ?? 'site'
}

function RadixChevron() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 opacity-50"
      aria-hidden="true"
    >
      <path
        d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function ConfigPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [config, setConfig] = useState<Record<string, Record<string, unknown>>>({})
  const [plans, setPlans] = useState<Array<{ id?: number; name?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<SectionId>(() => pathToSection(location.pathname))

  useEffect(() => {
    setSection(pathToSection(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    fetchConfig()
      .then((data) => setConfig(data as Record<string, Record<string, unknown>>))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
    fetchJsonList('/plan/fetch')
      .then((rows) => setPlans(rows as Array<{ id?: number; name?: string }>))
      .catch(() => setPlans([]))
  }, [t])

  function update(sec: string, key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [sec]: { ...prev[sec], [key]: value } }))
  }

  async function onBlurSave() {
    try {
      const flat: Record<string, unknown> = {}
      for (const sec of Object.values(config)) {
        if (sec && typeof sec === 'object') Object.assign(flat, sec)
      }
      await saveConfig(flat)
    } catch {
      toast.error(t('common.error'))
    }
  }

  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]
  const site = config.site ?? {}
  const safe = config.safe ?? {}
  const invite = config.invite ?? {}
  const subscribe = config.subscribe ?? {}
  const server = config.server ?? {}

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('settings.title')}</h1>
        <div className="text-muted-foreground">{t('settings.description')}</div>
      </div>

      <div data-orientation="horizontal" role="none" className="my-6 h-[1px] w-full shrink-0 bg-border" />

      <div className="flex flex-1 flex-col space-y-8 overflow-auto lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="sticky top-0 lg:w-1/5">
          <div className="p-1 md:hidden">
            <button
              type="button"
              role="combobox"
              aria-expanded="false"
              aria-autocomplete="none"
              dir="ltr"
              data-state="closed"
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-48 [&>span]:line-clamp-1"
            >
              <span style={{ pointerEvents: 'none' }}>
                <div className="flex gap-x-4 px-2 py-1">
                  <span className="scale-125">
                    <ConfigNavIcon name={active.icon} />
                  </span>
                  <span className="text-md">{t(active.labelKey)}</span>
                </div>
              </span>
              <RadixChevron />
            </button>
          </div>
          <div className="hidden w-full overflow-x-auto bg-background px-1 py-2 md:block">
            <nav className="config-nav flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
              {SECTIONS.map((item) => {
                const isActive = section === item.id
                const href = `#${sectionToPath(item.id)}`
                return (
                  <a
                    key={item.id}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      setSection(item.id)
                      navigate(sectionToPath(item.id))
                    }}
                    className={cn(
                      'inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 px-4 py-2 justify-start',
                      isActive ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline',
                    )}
                  >
                    <span className="mr-2">
                      <ConfigNavIcon name={item.icon} />
                    </span>
                    {t(item.labelKey)}
                  </a>
                )
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1 w-full p-1 pr-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
          <div className="pb-16">
            <div className="space-y-6">
              <div>
                <h3 className="m-0 text-lg font-medium">{t(active.labelKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(active.descKey)}</p>
              </div>
              <div data-orientation="horizontal" role="none" className="h-[1px] w-full shrink-0 bg-border" />
              <div className="xb-stack-4" onBlur={onBlurSave}>
                  {section === 'site' ? (
                    <>
                      <FormField
                        label={t('settings.site.form.siteName.label')}
                        description={t('settings.site.form.siteName.description')}
                        value={String(site.app_name ?? '')}
                        placeholder={t('settings.site.form.siteName.placeholder')}
                        onChange={(v) => update('site', 'app_name', v)}
                      />
                      <FormField
                        label={t('settings.site.form.siteDescription.label')}
                        description={t('settings.site.form.siteDescription.description')}
                        value={String(site.app_description ?? '')}
                        placeholder={t('settings.site.form.siteDescription.placeholder')}
                        onChange={(v) => update('site', 'app_description', v)}
                      />
                      <FormField
                        label={t('settings.site.form.siteUrl.label')}
                        description={t('settings.site.form.siteUrl.description')}
                        value={String(site.app_url ?? '')}
                        placeholder={t('settings.site.form.siteUrl.placeholder')}
                        onChange={(v) => update('site', 'app_url', v)}
                      />
                      <SwitchField
                        label={t('settings.site.form.forceHttps.label')}
                        description={t('settings.site.form.forceHttps.description')}
                        checked={Boolean(site.force_https)}
                        onChange={(v) => update('site', 'force_https', v)}
                      />
                      <FormField
                        label={t('settings.site.form.logo.label')}
                        description={t('settings.site.form.logo.description')}
                        value={String(site.logo ?? '')}
                        placeholder={t('settings.site.form.logo.placeholder')}
                        onChange={(v) => update('site', 'logo', v)}
                      />
                      <FormTextarea
                        label={t('settings.site.form.subscribeUrl.label')}
                        description={t('settings.site.form.subscribeUrl.description')}
                        value={String(site.subscribe_url ?? '')}
                        placeholder={t('settings.site.form.subscribeUrl.placeholder')}
                        onChange={(v) => update('site', 'subscribe_url', v)}
                      />
                      <FormField
                        label={t('settings.site.form.tosUrl.label')}
                        description={t('settings.site.form.tosUrl.description')}
                        value={String(site.tos_url ?? '')}
                        placeholder={t('settings.site.form.tosUrl.placeholder')}
                        onChange={(v) => update('site', 'tos_url', v)}
                      />
                      <SwitchField
                        label={t('settings.site.form.stopRegister.label')}
                        description={t('settings.site.form.stopRegister.description')}
                        checked={Boolean(site.stop_register)}
                        onChange={(v) => update('site', 'stop_register', v)}
                      />
                      <SwitchField
                        label={t('settings.site.form.ticketMustWaitReply.label')}
                        description={t('settings.site.form.ticketMustWaitReply.description')}
                        checked={Boolean(site.ticket_must_wait_reply)}
                        onChange={(v) => update('site', 'ticket_must_wait_reply', v)}
                      />
                      <ConfigFormSelect
                        label={t('settings.site.form.tryOut.label')}
                        description={t('settings.site.form.tryOut.description')}
                        value={String(site.try_out_plan_id ?? 0)}
                        onChange={(v) => update('site', 'try_out_plan_id', Number(v))}
                        options={[
                          { value: '0', label: t('settings.site.form.tryOut.placeholder') },
                          ...plans.map((plan) => ({
                            value: String(plan.id),
                            label: String(plan.name ?? plan.id),
                          })),
                        ]}
                      />
                      {Number(site.try_out_plan_id ?? 0) > 0 ? (
                        <FormField
                          label={t('settings.site.form.tryOutHour.label')}
                          description={t('settings.site.form.tryOutHour.description')}
                          value={String(site.try_out_hour ?? 1)}
                          onChange={(v) => update('site', 'try_out_hour', Number(v) || 1)}
                        />
                      ) : null}
                      <FormField
                        label={t('settings.site.form.currency.label')}
                        description={t('settings.site.form.currency.description')}
                        value={String(site.currency ?? 'CNY')}
                        placeholder={t('settings.site.form.currency.placeholder')}
                        onChange={(v) => update('site', 'currency', v)}
                      />
                      <FormField
                        label={t('settings.site.form.currencySymbol.label')}
                        description={t('settings.site.form.currencySymbol.description')}
                        value={String(site.currency_symbol ?? '¥')}
                        placeholder={t('settings.site.form.currencySymbol.placeholder')}
                        onChange={(v) => update('site', 'currency_symbol', v)}
                      />
                    </>
                  ) : null}

                  {section === 'invite' ? (
                    <>
                      <SwitchField
                        label={t('settings.invite.invite_force.title')}
                        description={t('settings.invite.invite_force.description')}
                        checked={Boolean(invite.invite_force)}
                        onChange={(v) => update('invite', 'invite_force', v)}
                      />
                      <FormField
                        label={t('settings.invite.invite_commission.title')}
                        description={t('settings.invite.invite_commission.description')}
                        value={String(invite.invite_commission ?? '')}
                        placeholder={t('settings.invite.invite_commission.placeholder')}
                        onChange={(v) => update('invite', 'invite_commission', v)}
                      />
                      <FormField
                        label={t('settings.invite.invite_gen_limit.title')}
                        description={t('settings.invite.invite_gen_limit.description')}
                        value={String(invite.invite_gen_limit ?? '')}
                        placeholder={t('settings.invite.invite_gen_limit.placeholder')}
                        onChange={(v) => update('invite', 'invite_gen_limit', v)}
                      />
                      <SwitchField
                        label={t('settings.invite.invite_never_expire.title')}
                        description={t('settings.invite.invite_never_expire.description')}
                        checked={Boolean(invite.invite_never_expire)}
                        onChange={(v) => update('invite', 'invite_never_expire', v)}
                      />
                      <SwitchField
                        label={t('settings.invite.commission_first_time.title')}
                        description={t('settings.invite.commission_first_time.description')}
                        checked={Boolean(invite.commission_first_time_enable)}
                        onChange={(v) => update('invite', 'commission_first_time_enable', v)}
                      />
                      <SwitchField
                        label={t('settings.invite.commission_auto_check.title')}
                        description={t('settings.invite.commission_auto_check.description')}
                        checked={Boolean(invite.commission_auto_check_enable)}
                        onChange={(v) => update('invite', 'commission_auto_check_enable', v)}
                      />
                      <FormField
                        label={t('settings.invite.commission_withdraw_limit.title')}
                        description={t('settings.invite.commission_withdraw_limit.description')}
                        value={String(invite.commission_withdraw_limit ?? '')}
                        placeholder={t('settings.invite.commission_withdraw_limit.placeholder')}
                        onChange={(v) => update('invite', 'commission_withdraw_limit', v)}
                      />
                      <FormField
                        label={t('settings.invite.commission_withdraw_method.title')}
                        description={t('settings.invite.commission_withdraw_method.description')}
                        value={String(invite.commission_withdraw_method ?? '')}
                        placeholder={t('settings.invite.commission_withdraw_method.placeholder')}
                        onChange={(v) => update('invite', 'commission_withdraw_method', v)}
                      />
                      <SwitchField
                        label={t('settings.invite.withdraw_close.title')}
                        description={t('settings.invite.withdraw_close.description')}
                        checked={Boolean(invite.withdraw_close_enable)}
                        onChange={(v) => update('invite', 'withdraw_close_enable', v)}
                      />
                      <SwitchField
                        label={t('settings.invite.commission_distribution.title')}
                        description={t('settings.invite.commission_distribution.description')}
                        checked={Boolean(invite.commission_distribution_enable)}
                        onChange={(v) => update('invite', 'commission_distribution_enable', v)}
                      />
                      {invite.commission_distribution_enable ? (
                        <>
                          <FormField
                            type="number"
                            subFieldLabel
                            label={t('settings.invite.commission_distribution.l1')}
                            description={t('settings.invite.commission_distribution.l1_description')}
                            value={String(invite.commission_distribution_l1 ?? '')}
                            placeholder={t('settings.invite.commission_distribution.placeholder')}
                            onChange={(v) => update('invite', 'commission_distribution_l1', v)}
                          />
                          <FormField
                            type="number"
                            subFieldLabel
                            label={t('settings.invite.commission_distribution.l2')}
                            description={t('settings.invite.commission_distribution.l2_description')}
                            value={String(invite.commission_distribution_l2 ?? '')}
                            placeholder={t('settings.invite.commission_distribution.placeholder')}
                            onChange={(v) => update('invite', 'commission_distribution_l2', v)}
                          />
                          <FormField
                            type="number"
                            subFieldLabel
                            label={t('settings.invite.commission_distribution.l3')}
                            description={t('settings.invite.commission_distribution.l3_description')}
                            value={String(invite.commission_distribution_l3 ?? '')}
                            placeholder={t('settings.invite.commission_distribution.placeholder')}
                            onChange={(v) => update('invite', 'commission_distribution_l3', v)}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {section === 'subscribe' ? (
                    <>
                      <SwitchField
                        flat
                        label={t('settings.subscribe.plan_change_enable.title')}
                        description={t('settings.subscribe.plan_change_enable.description')}
                        checked={Boolean(subscribe.plan_change_enable)}
                        onChange={(v) => update('subscribe', 'plan_change_enable', v)}
                      />
                      <ConfigFormSelect
                        label={t('settings.subscribe.reset_traffic_method.title')}
                        description={t('settings.subscribe.reset_traffic_method.description')}
                        value={String(subscribe.reset_traffic_method ?? 0)}
                        onChange={(v) => update('subscribe', 'reset_traffic_method', Number(v))}
                        options={[
                          { value: '0', label: t('settings.subscribe.reset_traffic_method.options.monthly_first') },
                          { value: '1', label: t('settings.subscribe.reset_traffic_method.options.monthly_reset') },
                          { value: '2', label: t('settings.subscribe.reset_traffic_method.options.no_reset') },
                          { value: '3', label: t('settings.subscribe.reset_traffic_method.options.yearly_first') },
                          { value: '4', label: t('settings.subscribe.reset_traffic_method.options.yearly_reset') },
                        ]}
                      />
                      <SwitchField
                        flat
                        label={t('settings.subscribe.surplus_enable.title')}
                        description={t('settings.subscribe.surplus_enable.description')}
                        checked={Boolean(subscribe.surplus_enable)}
                        onChange={(v) => update('subscribe', 'surplus_enable', v)}
                      />
                      <SwitchField
                        flat
                        label={t('settings.subscribe.surplus_traffic_ratio_enable.title')}
                        description={t('settings.subscribe.surplus_traffic_ratio_enable.description')}
                        checked={Boolean(subscribe.surplus_traffic_ratio_enable)}
                        onChange={(v) => update('subscribe', 'surplus_traffic_ratio_enable', v)}
                      />
                      <ConfigFormSelect
                        label={t('settings.subscribe.new_order_event.title')}
                        description={t('settings.subscribe.new_order_event.description')}
                        value={String(subscribe.new_order_event_id ?? 0)}
                        onChange={(v) => update('subscribe', 'new_order_event_id', Number(v))}
                        triggerWidth="max"
                        options={[
                          { value: '0', label: t('settings.subscribe.new_order_event.options.no_action') },
                          { value: '1', label: t('settings.subscribe.new_order_event.options.reset_traffic') },
                        ]}
                      />
                      <ConfigFormSelect
                        label={t('settings.subscribe.renew_order_event.title')}
                        description={t('settings.subscribe.renew_order_event.description')}
                        value={String(subscribe.renew_order_event_id ?? 0)}
                        onChange={(v) => update('subscribe', 'renew_order_event_id', Number(v))}
                        triggerWidth="max"
                        options={[
                          { value: '0', label: t('settings.subscribe.renew_order_event.options.no_action') },
                          { value: '1', label: t('settings.subscribe.renew_order_event.options.reset_traffic') },
                        ]}
                      />
                      <ConfigFormSelect
                        label={t('settings.subscribe.change_order_event.title')}
                        description={t('settings.subscribe.change_order_event.description')}
                        value={String(subscribe.change_order_event_id ?? 0)}
                        onChange={(v) => update('subscribe', 'change_order_event_id', Number(v))}
                        triggerWidth="max"
                        options={[
                          { value: '0', label: t('settings.subscribe.change_order_event.options.no_action') },
                          { value: '1', label: t('settings.subscribe.change_order_event.options.reset_traffic') },
                        ]}
                      />
                      <div className="xb-stack-2">
                        <label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base">
                          {t('settings.subscribe.subscribe_path.title')}
                        </label>
                        <input
                          className={inputCls}
                          placeholder={t('settings.subscribe.subscribe_path.placeholder')}
                          value={String(subscribe.subscribe_path ?? '')}
                          onChange={(e) => update('subscribe', 'subscribe_path', e.target.value)}
                        />
                        <div className="text-sm text-muted-foreground">
                          {t('settings.subscribe.subscribe_path.description')}
                          <br />
                          {t('settings.subscribe.subscribe_path.current_format')}
                          <br />
                          {t('settings.subscribe.subscribe_path.restart_tip')}
                        </div>
                      </div>
                      <SwitchField
                        flat
                        label={t('settings.subscribe.show_info_to_server.title')}
                        description={t('settings.subscribe.show_info_to_server.description')}
                        checked={Boolean(subscribe.show_info_to_server_enable)}
                        onChange={(v) => update('subscribe', 'show_info_to_server_enable', v)}
                      />
                      <SwitchField
                        flat
                        label={t('settings.subscribe.show_protocol_to_server.title')}
                        description={t('settings.subscribe.show_protocol_to_server.description')}
                        checked={Boolean(subscribe.show_protocol_to_server_enable)}
                        onChange={(v) => update('subscribe', 'show_protocol_to_server_enable', v)}
                      />
                    </>
                  ) : null}

                  {section === 'server' ? (
                    <>
                      <ServerTokenField
                        label={t('settings.server.server_token.title')}
                        description={t('settings.server.server_token.description')}
                        value={String(server.server_token ?? '')}
                        placeholder={t('settings.server.server_token.placeholder')}
                        onChange={(v) => update('server', 'server_token', v)}
                      />
                      <FormField
                        type="number"
                        label={t('settings.server.server_pull_interval.title')}
                        description={t('settings.server.server_pull_interval.description')}
                        value={String(server.server_pull_interval ?? '')}
                        placeholder={t('settings.server.server_pull_interval.placeholder')}
                        onChange={(v) => update('server', 'server_pull_interval', v)}
                      />
                      <FormField
                        type="number"
                        label={t('settings.server.server_push_interval.title')}
                        description={t('settings.server.server_push_interval.description')}
                        value={String(server.server_push_interval ?? '')}
                        placeholder={t('settings.server.server_push_interval.placeholder')}
                        onChange={(v) => update('server', 'server_push_interval', v)}
                      />
                      <ServerWsSwitchCard
                        label={t('settings.server.server_ws_enable.title')}
                        description={t('settings.server.server_ws_enable.description')}
                        checked={Boolean(server.server_ws_enable)}
                        onChange={(v) => update('server', 'server_ws_enable', v)}
                      />
                      <FormField
                        label={t('settings.server.server_ws_url.title')}
                        description={t('settings.server.server_ws_url.description')}
                        value={String(server.server_ws_url ?? '')}
                        placeholder={t('settings.server.server_ws_url.placeholder')}
                        onChange={(v) => update('server', 'server_ws_url', v)}
                      />
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden
                        >
                          <path d="M12 9v4" />
                          <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
                          <path d="M12 16h.01" />
                        </svg>
                        <p className="m-0">{t('settings.server.server_ws_enable.supported_clients')}</p>
                      </div>
                    </>
                  ) : null}

                  {['safe', 'email', 'telegram', 'app', 'subscribe_template'].includes(section) ? (
                    <ConfigSectionFields
                      section={section}
                      t={t}
                      config={config}
                      update={update}
                      FormField={FormField}
                      FormTextarea={FormTextarea}
                      SwitchField={SwitchField}
                    />
                  ) : null}

                  {!['site', 'invite', 'subscribe', 'server', 'safe', 'email', 'telegram', 'app', 'subscribe_template'].includes(
                    section,
                  ) ? (
                    <p className="text-sm text-muted-foreground">{t(active.descKey)}</p>
                  ) : null}
                </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  )
}

function FormField({
  label,
  description,
  value,
  placeholder,
  onChange,
  type = 'text',
  compactLabel,
  subFieldLabel,
}: {
  label: string
  description?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  type?: string
  compactLabel?: boolean
  /** 7001 invite distribution l1–l3: text-sm FormLabel, no description */
  subFieldLabel?: boolean
}) {
  const labelCls = subFieldLabel
    ? configSubFieldLabelCls
    : compactLabel
      ? configFieldLabelCls
      : 'font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base'
  return (
    <div className="xb-stack-2">
      <label className={labelCls}>
        {label}
      </label>
      <input
        type={type}
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {description ? <p className="m-0 text-[0.8rem] text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function ServerTokenField({
  label,
  description,
  value,
  placeholder,
  onChange,
}: {
  label: string
  description?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="xb-stack-2">
      <label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base">
        {label}
      </label>
      <div className="relative">
        <input
          className={cn(inputCls, 'pr-10')}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-0 top-0 inline-flex h-full w-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          onClick={() => onChange(crypto.randomUUID().replace(/-/g, ''))}
        >
          <IconRefresh className="h-4 w-4 text-muted-foreground hover:text-foreground" stroke={2} />
        </button>
      </div>
      {description ? <p className="text-[0.8rem] text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function FormTextarea({
  label,
  description,
  value,
  placeholder,
  onChange,
  compactLabel,
}: {
  label: string
  description?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  compactLabel?: boolean
}) {
  return (
    <div className="xb-stack-2">
      <label
        className={
          compactLabel
            ? configFieldLabelCls
            : 'font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base'
        }
      >
        {label}
      </label>
      <textarea
        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {description ? <p className="text-[0.8rem] text-muted-foreground">{description}</p> : null}
    </div>
  )
}

/** 7001 server 子页：WebSocket 开关为横向卡片 */
function ServerWsSwitchCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-row items-center justify-between space-y-2 rounded-lg border p-4">
      <div className="space-y-0.5">
        <label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base">
          {label}
        </label>
        {description ? <p className="m-0 text-[0.8rem] text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
  flat,
  compactLabel,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  /** 7001 subscribe 子页：label → desc → switch 同级 space-y-2 */
  flat?: boolean
  compactLabel?: boolean
}) {
  const labelCls = compactLabel
    ? configFieldLabelCls
    : 'font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base'
  if (flat) {
    return (
      <div className="xb-stack-2">
        <label className={labelCls}>{label}</label>
        {description ? <p className="m-0 text-[0.8rem] text-muted-foreground">{description}</p> : null}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    )
  }
  return (
    <div className="xb-stack-2">
      <div className="xb-stack-05">
        <label className={labelCls}>{label}</label>
        {description ? <p className="m-0 text-[0.8rem] text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
