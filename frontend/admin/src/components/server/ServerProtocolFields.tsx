import { useMemo, useState } from 'react'

import { Check, ChevronsUpDown, Key, RefreshCw } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import { FormSelect } from '@/components/shared/FormSelect'

import { SuffixInput } from '@/components/shared/SuffixInput'

import { inputCls, textareaCls } from '@/lib/form-styles'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

import { Label } from '@/components/ui/label'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { Switch } from '@/components/ui/switch'

import { generateRealityKeyPair, generateRealityShortId } from '@/lib/reality-keys'

import {
  ANYTLS_DEFAULT_PADDING_SCHEME,
  HYSTERIA_ALPN_OPTIONS,
  HYSTERIA_VERSIONS,
  TRANSPORT_NETWORK_OPTIONS,
  TRANSPORT_NETWORKS_WITH_SUBFIELDS,
  TUIC_ALPN_OPTIONS,
  defaultTransportNetworkSettings,
  readTransportNetworkSettings,
  serializeTransportNetworkSettings,
  type TransportNetworkSettingsFields,
  TUIC_CONGESTION_CONTROLS,
  TUIC_UDP_RELAY_MODES,
  TUIC_VERSIONS,
  VLESS_FLOW_OPTIONS,
  defaultAnyTlsSettings,
  defaultHysteriaSettings,
  defaultTrojanSettings,
  defaultTuicSettings,
  defaultVlessSettings,
  normalizeAnyTlsSettings,
  normalizeHysteriaSettings,
  normalizeTrojanSettings,
  normalizeTuicSettings,
  normalizeVlessSettings,
  randomObfsPassword,
  serializeAnyTlsSettings,
  serializeHysteriaSettings,
  serializeTrojanSettings,
  serializeTuicSettings,
  serializeVlessSettings,
  type AnyTlsProtocolSettings,
  type HysteriaProtocolSettings,
  type RealitySettingsFields,
  type TrojanProtocolSettings,
  type TuicProtocolSettings,
  type VlessProtocolSettings,
} from '@/lib/server-protocol-settings'

const SS_CIPHERS = [
  'aes-128-gcm',
  'aes-192-gcm',
  'aes-256-gcm',
  'chacha20-ietf-poly1305',
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
  '2022-blake3-chacha20-poly1305',
] as const

const SS_PLUGIN_VALUES = [
  'none',
  'obfs',
  'v2ray-plugin',
  'gost-plugin',
  'shadow-tls',
  'restls',
  'kcptun',
] as const

const SS_PLUGIN_FALLBACKS: Record<(typeof SS_PLUGIN_VALUES)[number], string> = {
  none: 'None',
  obfs: 'Simple Obfs',
  'v2ray-plugin': 'V2Ray Plugin',
  'gost-plugin': 'Gost Plugin',
  'shadow-tls': 'Shadow TLS',
  restls: 'ResTLS',
  kcptun: 'KCPTun',
}

const SS_FINGERPRINTS = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'safari', label: 'Safari' },
  { value: 'ios', label: 'iOS' },
] as const

const VMESS_NETWORKS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'ws', label: 'Websocket' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'h2', label: 'HTTP/2' },
  { value: 'httpupgrade', label: 'HttpUpgrade' },
  { value: 'xhttp', label: 'XHTTP' },
] as const

export type ShadowsocksProtocolForm = {
  cipher: string
  plugin: string
  plugin_opts: string
  client_fingerprint: string
  obfs: string
  obfs_settings: { path: string; host: string }
}

export type VmessProtocolForm = {
  tls: number
  network: string
  tls_settings: {
    server_name: string
    allow_insecure: boolean
  }
  network_settings: TransportNetworkSettingsFields
}

export type ProtocolFormSettings =
  | ShadowsocksProtocolForm
  | VmessProtocolForm
  | TrojanProtocolSettings
  | VlessProtocolSettings
  | HysteriaProtocolSettings
  | TuicProtocolSettings
  | AnyTlsProtocolSettings

export function defaultShadowsocksSettings(): ShadowsocksProtocolForm {
  return {
    cipher: 'aes-256-gcm',
    plugin: '',
    plugin_opts: '',
    client_fingerprint: 'chrome',
    obfs: '',
    obfs_settings: { path: '', host: '' },
  }
}

export function defaultVmessSettings(): VmessProtocolForm {
  return {
    tls: 0,
    network: 'tcp',
    tls_settings: { server_name: '', allow_insecure: false },
    network_settings: defaultTransportNetworkSettings(),
  }
}

export function defaultProtocolSettings(type: string): ProtocolFormSettings | null {
  if (type === 'shadowsocks') return defaultShadowsocksSettings()
  if (type === 'vmess') return defaultVmessSettings()
  if (type === 'trojan') return defaultTrojanSettings()
  if (type === 'vless') return defaultVlessSettings()
  if (type === 'hysteria') return defaultHysteriaSettings()
  if (type === 'tuic') return defaultTuicSettings()
  if (type === 'anytls') return defaultAnyTlsSettings()
  return null
}

function readObfsSettings(raw?: Record<string, unknown>) {
  const settings = (raw?.obfs_settings ?? {}) as Record<string, unknown>
  return {
    path: String(settings.path ?? ''),
    host: String(settings.host ?? ''),
  }
}

export function readProtocolSettings(
  type: string,
  raw?: Record<string, unknown>,
): ProtocolFormSettings | null {
  if (type === 'shadowsocks') {
    const plugin = String(raw?.plugin ?? '')
    return {
      cipher: String(raw?.cipher ?? 'aes-256-gcm'),
      plugin: plugin === '' ? 'none' : plugin,
      plugin_opts: String(raw?.plugin_opts ?? ''),
      client_fingerprint: String(raw?.client_fingerprint ?? 'chrome'),
      obfs: String(raw?.obfs ?? ''),
      obfs_settings: readObfsSettings(raw),
    }
  }
  if (type === 'vmess') {
    const tlsSettings = (raw?.tls_settings ?? {}) as Record<string, unknown>
    return {
      tls: Number(raw?.tls ?? 0),
      network: String(raw?.network ?? 'tcp'),
      tls_settings: {
        server_name: String(tlsSettings.server_name ?? ''),
        allow_insecure: Boolean(tlsSettings.allow_insecure),
      },
      network_settings: readTransportNetworkSettings(raw?.network_settings),
    }
  }
  if (type === 'trojan') return normalizeTrojanSettings(raw)
  if (type === 'vless') return normalizeVlessSettings(raw)
  if (type === 'hysteria') return normalizeHysteriaSettings(raw)
  if (type === 'tuic') return normalizeTuicSettings(raw)
  if (type === 'anytls') return normalizeAnyTlsSettings(raw)
  return null
}

export function toProtocolSettingsPayload(
  type: string,
  settings: ProtocolFormSettings,
): Record<string, unknown> {
  if (type === 'shadowsocks') {
    const ss = settings as ShadowsocksProtocolForm
    const plugin = ss.plugin === 'none' ? '' : ss.plugin
    const payload: Record<string, unknown> = {
      cipher: ss.cipher || 'aes-256-gcm',
      plugin: plugin || undefined,
      plugin_opts: plugin && ss.plugin_opts ? ss.plugin_opts : undefined,
    }
    if (plugin === 'shadow-tls' || plugin === 'restls') {
      payload.client_fingerprint = ss.client_fingerprint || 'chrome'
    }
    if (ss.obfs && ss.obfs !== 'none') {
      payload.obfs = ss.obfs
      payload.obfs_settings = {
        path: ss.obfs_settings.path || undefined,
        host: ss.obfs_settings.host || undefined,
      }
    }
    return payload
  }
  if (type === 'vmess') {
    const vm = settings as VmessProtocolForm
    const payload: Record<string, unknown> = {
      tls: vm.tls,
      network: vm.network || 'tcp',
    }
    if (vm.tls === 1) {
      payload.tls_settings = {
        server_name: vm.tls_settings.server_name || undefined,
        allow_insecure: vm.tls_settings.allow_insecure,
      }
    }
    const networkSettings = serializeTransportNetworkSettings(vm.network, vm.network_settings)
    if (networkSettings) payload.network_settings = networkSettings
    return payload
  }
  if (type === 'trojan') return serializeTrojanSettings(settings as TrojanProtocolSettings)
  if (type === 'vless') return serializeVlessSettings(settings as VlessProtocolSettings)
  if (type === 'hysteria') return serializeHysteriaSettings(settings as HysteriaProtocolSettings)
  if (type === 'tuic') return serializeTuicSettings(settings as TuicProtocolSettings)
  if (type === 'anytls') return serializeAnyTlsSettings(settings as AnyTlsProtocolSettings)
  return {}
}

function ssPluginLocaleKey(value: string): string {
  const suffix: Record<string, string> = {
    'v2ray-plugin': 'v2ray',
    'gost-plugin': 'gost',
    'shadow-tls': 'shadow_tls',
  }
  return `server.dynamic_form.shadowsocks.plugin.${suffix[value] ?? value}`
}

function ssCipherLocaleKey(cipher: string): string {
  return `server.dynamic_form.shadowsocks.cipher.${cipher}`
}

function resolveLocaleLabel(
  i18n: { exists: (key: string) => boolean },
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  return i18n.exists(key) ? t(key) : fallback
}

function pluginHintKey(plugin: string): string | null {
  switch (plugin) {
    case 'obfs':
      return 'server.dynamic_form.shadowsocks.plugin.obfs_hint'
    case 'v2ray-plugin':
      return 'server.dynamic_form.shadowsocks.plugin.v2ray_hint'
    case 'gost-plugin':
      return 'server.dynamic_form.shadowsocks.plugin.gost_hint'
    case 'shadow-tls':
      return 'server.dynamic_form.shadowsocks.plugin.shadow_tls_hint'
    case 'restls':
      return 'server.dynamic_form.shadowsocks.plugin.restls_hint'
    case 'kcptun':
      return 'server.dynamic_form.shadowsocks.plugin.kcptun_hint'
    default:
      return null
  }
}

function CipherSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const cipherLabel = (cipher: string) =>
    resolveLocaleLabel(i18n, t, ssCipherLocaleKey(cipher), cipher)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return [...SS_CIPHERS]
    return SS_CIPHERS.filter((c) => c.includes(q))
  }, [search])

  const showCustom = search.trim() !== '' && !SS_CIPHERS.includes(search.trim() as (typeof SS_CIPHERS)[number])

  return (
    <div className="xb-stack-2">
      <Label>{t('server.dynamic_form.shadowsocks.cipher.label')}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-mono text-xs', !value && 'text-muted-foreground')}
          >
            {value ? cipherLabel(value) : t('server.dynamic_form.shadowsocks.cipher.placeholder')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-3rem))] p-0" align="start">
          <div className="border-b p-2">
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={search}
              onChange={(e) => {
                const next = e.target.value
                setSearch(next)
                if (next && !SS_CIPHERS.includes(next as (typeof SS_CIPHERS)[number])) {
                  onChange(next)
                }
              }}
              placeholder={t('server.dynamic_form.shadowsocks.cipher.search_placeholder')}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {showCustom ? (
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(search.trim())
                  setSearch('')
                  setOpen(false)
                }}
              >
                <Check className="mr-2 h-4 w-4 opacity-100" />
                <span className="font-medium text-primary">
                  {t('server.dynamic_form.shadowsocks.cipher.use_custom')} &quot;{search.trim()}&quot;
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({t('server.dynamic_form.shadowsocks.cipher.custom_label')})
                </span>
              </button>
            ) : null}
            {!showCustom && search && filtered.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                <p>{t('server.dynamic_form.shadowsocks.cipher.no_results')}</p>
                <p className="mt-1 text-xs">{t('server.dynamic_form.shadowsocks.cipher.custom_hint')}</p>
              </div>
            ) : null}
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {t('server.dynamic_form.shadowsocks.cipher.preset_group')}
            </p>
            {filtered.map((cipher) => (
              <button
                key={cipher}
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left font-mono text-xs hover:bg-accent"
                onClick={() => {
                  onChange(cipher)
                  setSearch('')
                  setOpen(false)
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === cipher ? 'opacity-100' : 'opacity-0')} />
                {cipherLabel(cipher)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">{t('server.dynamic_form.shadowsocks.cipher.description')}</p>
    </div>
  )
}

function ShadowsocksFields({
  value,
  onChange,
}: {
  value: ShadowsocksProtocolForm
  onChange: (next: ShadowsocksProtocolForm) => void
}) {
  const { t, i18n } = useTranslation()
  const hintKey = pluginHintKey(value.plugin)

  const pluginOptions = useMemo(
    () =>
      SS_PLUGIN_VALUES.map((plugin) => ({
        value: plugin,
        label: resolveLocaleLabel(
          i18n,
          t,
          ssPluginLocaleKey(plugin),
          SS_PLUGIN_FALLBACKS[plugin],
        ),
      })),
    [i18n, t],
  )

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <CipherSelect
        value={value.cipher}
        onChange={(cipher) => onChange({ ...value, cipher })}
      />

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.shadowsocks.plugin.label')}</Label>
        <FormSelect
          value={value.plugin || 'none'}
          onChange={(plugin) => onChange({ ...value, plugin })}
          options={pluginOptions}
          placeholder={t('server.dynamic_form.shadowsocks.plugin.placeholder')}
          className="font-mono text-xs"
        />
        {hintKey ? <p className="text-xs text-muted-foreground">{t(hintKey)}</p> : null}
      </div>

      {value.plugin && value.plugin !== 'none' ? (
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.shadowsocks.plugin_opts.label')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('server.dynamic_form.shadowsocks.plugin_opts.description')}
          </p>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={value.plugin_opts}
            onChange={(e) => onChange({ ...value, plugin_opts: e.target.value })}
            placeholder={t('server.dynamic_form.shadowsocks.plugin_opts.placeholder')}
          />
        </div>
      ) : null}

      {value.plugin === 'shadow-tls' || value.plugin === 'restls' ? (
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.shadowsocks.client_fingerprint')}</Label>
          <FormSelect
            value={value.client_fingerprint || 'chrome'}
            onChange={(client_fingerprint) => onChange({ ...value, client_fingerprint })}
            options={SS_FINGERPRINTS.map((f) => ({ value: f.value, label: f.label }))}
            placeholder={t('server.dynamic_form.shadowsocks.client_fingerprint_placeholder')}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {t('server.dynamic_form.shadowsocks.client_fingerprint_description')}
          </p>
        </div>
      ) : null}

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.shadowsocks.obfs.label')}</Label>
        <FormSelect
          value={value.obfs || 'none'}
          onChange={(obfs) => onChange({ ...value, obfs: obfs === 'none' ? '' : obfs })}
          options={[
            { value: 'none', label: t('server.dynamic_form.shadowsocks.obfs.none') },
            { value: 'http', label: t('server.dynamic_form.shadowsocks.obfs.http') },
          ]}
          placeholder={t('server.dynamic_form.shadowsocks.obfs.placeholder')}
          className="font-mono text-xs"
        />
      </div>

      {value.obfs === 'http' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.shadowsocks.obfs_settings.path')}</Label>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={value.obfs_settings.path}
              onChange={(e) =>
                onChange({
                  ...value,
                  obfs_settings: { ...value.obfs_settings, path: e.target.value },
                })
              }
            />
          </div>
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.shadowsocks.obfs_settings.host')}</Label>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={value.obfs_settings.host}
              onChange={(e) =>
                onChange({
                  ...value,
                  obfs_settings: { ...value.obfs_settings, host: e.target.value },
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TransportNetworkSubFields({
  locale,
  network,
  value,
  onChange,
}: {
  locale: string
  network: string
  value: TransportNetworkSettingsFields
  onChange: (next: TransportNetworkSettingsFields) => void
}) {
  const { t } = useTranslation()

  if (!TRANSPORT_NETWORKS_WITH_SUBFIELDS.has(network)) return null

  if (network === 'grpc') {
    return (
      <div className="xb-stack-2">
        <Label>{t(`${locale}.serviceName`, { defaultValue: 'Service Name' })}</Label>
        <input
          className={cn(inputCls, 'font-mono text-xs')}
          value={value.serviceName}
          onChange={(e) => onChange({ ...value, serviceName: e.target.value })}
          placeholder={t(`${locale}.serviceName_placeholder`, { defaultValue: 'GunService' })}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="xb-stack-2">
        <Label>{t(`${locale}.path`, { defaultValue: 'Path' })}</Label>
        <input
          className={cn(inputCls, 'font-mono text-xs')}
          value={value.path}
          onChange={(e) => onChange({ ...value, path: e.target.value })}
          placeholder={t(`${locale}.path_placeholder`, { defaultValue: '/' })}
        />
      </div>
      <div className="xb-stack-2">
        <Label>{t(`${locale}.host`, { defaultValue: 'Host' })}</Label>
        <input
          className={cn(inputCls, 'font-mono text-xs')}
          value={value.host}
          onChange={(e) => onChange({ ...value, host: e.target.value })}
          placeholder={t(`${locale}.host_placeholder`, { defaultValue: 'v2ray.com' })}
        />
      </div>
    </div>
  )
}

function VmessFields({
  value,
  onChange,
}: {
  value: VmessProtocolForm
  onChange: (next: VmessProtocolForm) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.vmess.tls.label')}</Label>
        <FormSelect
          value={String(value.tls)}
          onChange={(v) => onChange({ ...value, tls: Number(v) })}
          options={[
            { value: '0', label: t('server.dynamic_form.vmess.tls.disabled', { defaultValue: 'None' }) },
            { value: '1', label: t('server.dynamic_form.vmess.tls.enabled', { defaultValue: 'TLS' }) },
          ]}
          placeholder={t('server.dynamic_form.vmess.tls.placeholder')}
          className="font-mono text-xs"
        />
      </div>

      {value.tls === 1 ? (
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.vmess.tls_settings.server_name.label')}</Label>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={value.tls_settings.server_name}
              onChange={(e) =>
                onChange({
                  ...value,
                  tls_settings: { ...value.tls_settings, server_name: e.target.value },
                })
              }
              placeholder={t('server.dynamic_form.vmess.tls_settings.server_name.placeholder')}
            />
          </div>
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.vmess.tls_settings.allow_insecure')}</Label>
            <div className="flex h-10 items-center justify-center">
              <Switch
                checked={value.tls_settings.allow_insecure}
                onCheckedChange={(allow_insecure) =>
                  onChange({
                    ...value,
                    tls_settings: { ...value.tls_settings, allow_insecure },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.vmess.network.label')}</Label>
        <FormSelect
          value={value.network}
          onChange={(network) => onChange({ ...value, network })}
          options={VMESS_NETWORKS.map((n) => ({ value: n.value, label: n.label }))}
          placeholder={t('server.dynamic_form.vmess.network.placeholder')}
          className="font-mono text-xs"
        />
      </div>

      <TransportNetworkSubFields
        locale="server.dynamic_form.vmess.network_settings"
        network={value.network}
        value={value.network_settings}
        onChange={(network_settings) => onChange({ ...value, network_settings })}
      />
    </div>
  )
}

function RealityFields({
  settings,
  onChange,
}: {
  settings: TrojanProtocolSettings | VlessProtocolSettings
  onChange: (next: TrojanProtocolSettings | VlessProtocolSettings) => void
}) {
  const { t } = useTranslation()
  const locale = 'server.dynamic_form.vless.reality_settings'
  const reality = settings.reality_settings

  function patchReality(patch: Partial<RealitySettingsFields>) {
    onChange({ ...settings, reality_settings: { ...reality, ...patch } })
  }

  async function generateKeyPair() {
    try {
      const pair = await generateRealityKeyPair()
      patchReality({ private_key: pair.privateKey, public_key: pair.publicKey })
      toast.success(t(`${locale}.key_pair.success`))
    } catch {
      toast.error(t(`${locale}.key_pair.error`))
    }
  }

  function generateShortId() {
    patchReality({ short_id: generateRealityShortId() })
    toast.success(t(`${locale}.short_id.success`))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="xb-stack-2 col-span-2 sm:col-span-1">
          <Label>{t(`${locale}.server_name.label`)}</Label>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={reality.server_name}
            onChange={(e) => patchReality({ server_name: e.target.value })}
            placeholder={t(`${locale}.server_name.placeholder`)}
          />
        </div>
        <div className="xb-stack-2">
          <Label>{t(`${locale}.server_port.label`)}</Label>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={reality.server_port}
            onChange={(e) => patchReality({ server_port: e.target.value })}
            placeholder={t(`${locale}.server_port.placeholder`)}
          />
        </div>
        <div className="xb-stack-2 flex flex-col justify-end">
          <Label>{t(`${locale}.allow_insecure`)}</Label>
          <div className="flex h-10 items-center">
            <Switch
              checked={reality.allow_insecure}
              onCheckedChange={(v) => patchReality({ allow_insecure: v })}
            />
          </div>
        </div>
      </div>

      <div className="xb-stack-2">
        <Label>{t(`${locale}.private_key.label`)}</Label>
        <div className="relative">
          <input
            className={cn(inputCls, 'pr-10 font-mono text-xs')}
            value={reality.private_key}
            onChange={(e) => patchReality({ private_key: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-9"
            onClick={() => void generateKeyPair()}
            title={t(`${locale}.key_pair.generate`)}
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="xb-stack-2">
        <Label>{t(`${locale}.public_key.label`)}</Label>
        <input
          className={cn(inputCls, 'font-mono text-xs')}
          value={reality.public_key}
          onChange={(e) => patchReality({ public_key: e.target.value })}
        />
      </div>

      <div className="xb-stack-2">
        <Label>{t(`${locale}.short_id.label`)}</Label>
        <div className="relative">
          <input
            className={cn(inputCls, 'pr-10 font-mono text-xs')}
            value={reality.short_id}
            onChange={(e) => patchReality({ short_id: e.target.value })}
            placeholder={t(`${locale}.short_id.placeholder`)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-9"
            onClick={generateShortId}
            title={t(`${locale}.short_id.generate`)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t(`${locale}.short_id.description`)}</p>
      </div>
    </div>
  )
}

function TrojanFields({
  value,
  onChange,
}: {
  value: TrojanProtocolSettings
  onChange: (next: TrojanProtocolSettings) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.vless.tls.label')}</Label>
        <FormSelect
          value={String(value.tls)}
          onChange={(v) => onChange({ ...value, tls: Number(v) })}
          options={[
            { value: '1', label: t('server.dynamic_form.vless.tls.tls') },
            { value: '2', label: t('server.dynamic_form.vless.tls.reality') },
          ]}
          placeholder={t('server.dynamic_form.vless.tls.placeholder')}
          className="font-mono text-xs"
        />
      </div>

      {value.tls === 1 ? (
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.trojan.server_name.label')}</Label>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={value.tls_settings.server_name}
              onChange={(e) =>
                onChange({
                  ...value,
                  tls_settings: { ...value.tls_settings, server_name: e.target.value },
                })
              }
              placeholder={t('server.dynamic_form.trojan.server_name.placeholder')}
            />
          </div>
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.trojan.allow_insecure')}</Label>
            <div className="flex h-10 items-center justify-center">
              <Switch
                checked={value.tls_settings.allow_insecure}
                onCheckedChange={(allow_insecure) =>
                  onChange({
                    ...value,
                    tls_settings: { ...value.tls_settings, allow_insecure },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {value.tls === 2 ? <RealityFields settings={value} onChange={onChange} /> : null}

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.trojan.network.label')}</Label>
        <FormSelect
          value={value.network}
          onChange={(network) => onChange({ ...value, network })}
          options={TRANSPORT_NETWORK_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          placeholder={t('server.dynamic_form.trojan.network.placeholder')}
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

function VlessFields({
  value,
  onChange,
}: {
  value: VlessProtocolSettings
  onChange: (next: VlessProtocolSettings) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.vless.tls.label')}</Label>
        <FormSelect
          value={String(value.tls)}
          onChange={(v) => onChange({ ...value, tls: Number(v) })}
          options={[
            { value: '0', label: t('server.dynamic_form.vless.tls.none') },
            { value: '1', label: t('server.dynamic_form.vless.tls.tls') },
            { value: '2', label: t('server.dynamic_form.vless.tls.reality') },
          ]}
          placeholder={t('server.dynamic_form.vless.tls.placeholder')}
          className="font-mono text-xs"
        />
      </div>

      {value.tls === 1 ? (
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.vless.tls_settings.server_name.label')}</Label>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={value.tls_settings.server_name}
              onChange={(e) =>
                onChange({
                  ...value,
                  tls_settings: { ...value.tls_settings, server_name: e.target.value },
                })
              }
              placeholder={t('server.dynamic_form.vless.tls_settings.server_name.placeholder')}
            />
          </div>
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.vless.tls_settings.allow_insecure')}</Label>
            <div className="flex h-10 items-center justify-center">
              <Switch
                checked={value.tls_settings.allow_insecure}
                onCheckedChange={(allow_insecure) =>
                  onChange({
                    ...value,
                    tls_settings: { ...value.tls_settings, allow_insecure },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {value.tls === 2 ? <RealityFields settings={value} onChange={onChange} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.vless.network.label')}</Label>
          <FormSelect
            value={value.network}
            onChange={(network) => onChange({ ...value, network })}
            options={TRANSPORT_NETWORK_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder={t('server.dynamic_form.vless.network.placeholder')}
            className="font-mono text-xs"
          />
        </div>
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.vless.flow.label')}</Label>
          <FormSelect
            value={value.flow || 'none'}
            onChange={(flow) => onChange({ ...value, flow: flow === 'none' ? '' : flow })}
            options={VLESS_FLOW_OPTIONS.map((f) => ({ value: f, label: f }))}
            placeholder={t('server.dynamic_form.vless.flow.placeholder')}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <TransportNetworkSubFields
        locale="server.dynamic_form.vless.network_settings"
        network={value.network}
        value={value.network_settings}
        onChange={(network_settings) => onChange({ ...value, network_settings })}
      />

      <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>{t('server.dynamic_form.vless.encryption.label')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('server.dynamic_form.vless.encryption.description')}
            </p>
          </div>
          <Switch
            checked={value.encryption.enabled}
            onCheckedChange={(enabled) =>
              onChange({ ...value, encryption: { ...value.encryption, enabled } })
            }
          />
        </div>
        {value.encryption.enabled ? (
          <div className="space-y-3 border-t border-dashed pt-3">
            <div className="xb-stack-2">
              <Label>{t('server.dynamic_form.vless.encryption.server_label')}</Label>
              <input
                className={cn(inputCls, 'font-mono text-xs')}
                value={value.encryption.decryption}
                onChange={(e) =>
                  onChange({
                    ...value,
                    encryption: { ...value.encryption, decryption: e.target.value },
                  })
                }
                placeholder={t('server.dynamic_form.vless.encryption.server_placeholder')}
              />
            </div>
            <div className="xb-stack-2">
              <Label>{t('server.dynamic_form.vless.encryption.client_label')}</Label>
              <input
                className={cn(inputCls, 'font-mono text-xs')}
                value={value.encryption.encryption}
                onChange={(e) =>
                  onChange({
                    ...value,
                    encryption: { ...value.encryption, encryption: e.target.value },
                  })
                }
                placeholder={t('server.dynamic_form.vless.encryption.client_placeholder')}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function HysteriaFields({
  value,
  onChange,
}: {
  value: HysteriaProtocolSettings
  onChange: (next: HysteriaProtocolSettings) => void
}) {
  const { t } = useTranslation()

  function patch(partial: Partial<HysteriaProtocolSettings>) {
    onChange({ ...value, ...partial })
  }

  function patchObfs(partial: Partial<HysteriaProtocolSettings['obfs']>) {
    onChange({ ...value, obfs: { ...value.obfs, ...partial } })
  }

  function patchTls(partial: Partial<HysteriaProtocolSettings['tls']>) {
    onChange({ ...value, tls: { ...value.tls, ...partial } })
  }

  function patchBandwidth(partial: Partial<HysteriaProtocolSettings['bandwidth']>) {
    onChange({ ...value, bandwidth: { ...value.bandwidth, ...partial } })
  }

  const bbrTip =
    value.version === 2 ? t('server.dynamic_form.hysteria.bandwidth.up.bbr_tip') : ''

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.hysteria.version.label')}</Label>
          <FormSelect
            value={String(value.version)}
            onChange={(v) => patch({ version: Number(v) })}
            options={HYSTERIA_VERSIONS.map((v) => ({ value: v, label: `V${v}` }))}
            className="font-mono text-xs"
          />
        </div>
        {value.version === 1 ? (
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.hysteria.alpn.label')}</Label>
            <FormSelect
              value={value.alpn}
              onChange={(v) => patch({ alpn: v })}
              options={HYSTERIA_ALPN_OPTIONS.map((v) => ({ value: v, label: v }))}
              className="font-mono text-xs"
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5">
          <Label>{t('server.dynamic_form.hysteria.obfs.label')}</Label>
          <Switch checked={value.obfs.open} onCheckedChange={(open) => patchObfs({ open })} />
        </div>
        {value.obfs.open && value.version === 2 ? (
          <div className="xb-stack-2">
            <Label>{t('server.dynamic_form.hysteria.obfs.type.label')}</Label>
            <FormSelect
              value={value.obfs.type}
              onChange={(v) => patchObfs({ type: v })}
              options={[
                {
                  value: 'salamander',
                  label: t('server.dynamic_form.hysteria.obfs.type.salamander'),
                },
              ]}
              className="font-mono text-xs"
            />
          </div>
        ) : null}
      </div>

      {value.obfs.open ? (
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.hysteria.obfs.password.label')}</Label>
          <div className="relative">
            <input
              className={cn(inputCls, 'pr-10 font-mono text-xs')}
              value={value.obfs.password}
              onChange={(e) => patchObfs({ password: e.target.value })}
              placeholder={t('server.dynamic_form.hysteria.obfs.password.placeholder')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-2"
              onClick={() => {
                patchObfs({ password: randomObfsPassword() })
                toast.success(t('server.dynamic_form.hysteria.obfs.password.generate_success'))
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.hysteria.tls.server_name.label')}</Label>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={value.tls.server_name}
            onChange={(e) => patchTls({ server_name: e.target.value })}
            placeholder={t('server.dynamic_form.hysteria.tls.server_name.placeholder')}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5">
          <Label>{t('server.dynamic_form.hysteria.tls.allow_insecure')}</Label>
          <Switch
            checked={value.tls.allow_insecure}
            onCheckedChange={(allow_insecure) => patchTls({ allow_insecure })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.hysteria.bandwidth.up.label')}</Label>
          <SuffixInput
            type="number"
            suffix={t('server.dynamic_form.hysteria.bandwidth.up.suffix')}
            value={value.bandwidth.up}
            onChange={(e) => patchBandwidth({ up: e.target.value })}
            placeholder={t('server.dynamic_form.hysteria.bandwidth.up.placeholder') + bbrTip}
            className="font-mono text-xs"
          />
        </div>
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.hysteria.bandwidth.down.label')}</Label>
          <SuffixInput
            type="number"
            suffix={t('server.dynamic_form.hysteria.bandwidth.down.suffix')}
            value={value.bandwidth.down}
            onChange={(e) => patchBandwidth({ down: e.target.value })}
            placeholder={t('server.dynamic_form.hysteria.bandwidth.down.placeholder') + bbrTip}
            className="font-mono text-xs"
          />
        </div>
      </div>
    </div>
  )
}

function TuicFields({
  value,
  onChange,
}: {
  value: TuicProtocolSettings
  onChange: (next: TuicProtocolSettings) => void
}) {
  const { t } = useTranslation()

  function patch(partial: Partial<TuicProtocolSettings>) {
    onChange({ ...value, ...partial })
  }

  function patchTls(partial: Partial<TuicProtocolSettings['tls']>) {
    onChange({ ...value, tls: { ...value.tls, ...partial } })
  }

  function toggleAlpn(alpn: string) {
    const next = value.alpn.includes(alpn)
      ? value.alpn.filter((item) => item !== alpn)
      : [...value.alpn, alpn]
    patch({ alpn: next })
  }

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.tuic.version.label')}</Label>
        <FormSelect
          value={String(value.version)}
          onChange={(v) => patch({ version: Number(v) })}
          options={TUIC_VERSIONS.map((v) => ({ value: v, label: `V${v}` }))}
          className="font-mono text-xs"
        />
      </div>

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.tuic.congestion_control.label')}</Label>
        <FormSelect
          value={value.congestion_control}
          onChange={(v) => patch({ congestion_control: v })}
          options={TUIC_CONGESTION_CONTROLS.map((v) => ({
            value: v,
            label: v.toUpperCase(),
          }))}
          className="font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.tuic.tls.server_name.label')}</Label>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={value.tls.server_name}
            onChange={(e) => patchTls({ server_name: e.target.value })}
            placeholder={t('server.dynamic_form.tuic.tls.server_name.placeholder')}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5">
          <Label>{t('server.dynamic_form.tuic.tls.allow_insecure')}</Label>
          <Switch
            checked={value.tls.allow_insecure}
            onCheckedChange={(allow_insecure) => patchTls({ allow_insecure })}
          />
        </div>
      </div>

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.tuic.tls.alpn.label')}</Label>
        <div className="flex flex-wrap gap-2">
          {TUIC_ALPN_OPTIONS.map((opt) => {
            const active = value.alpn.includes(opt.value)
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="h-8"
                onClick={() => toggleAlpn(opt.value)}
              >
                {opt.label}
              </Button>
            )
          })}
        </div>
        {!value.alpn.length ? (
          <p className="text-xs text-muted-foreground">
            {t('server.dynamic_form.tuic.tls.alpn.empty')}
          </p>
        ) : null}
      </div>

      <div className="xb-stack-2">
        <Label>{t('server.dynamic_form.tuic.udp_relay_mode.label')}</Label>
        <FormSelect
          value={value.udp_relay_mode}
          onChange={(v) => patch({ udp_relay_mode: v })}
          options={TUIC_UDP_RELAY_MODES.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

function AnyTlsFields({
  value,
  onChange,
}: {
  value: AnyTlsProtocolSettings
  onChange: (next: AnyTlsProtocolSettings) => void
}) {
  const { t } = useTranslation()

  function patchTls(partial: Partial<AnyTlsProtocolSettings['tls']>) {
    onChange({ ...value, tls: { ...value.tls, ...partial } })
  }

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="xb-stack-2">
          <Label>{t('server.dynamic_form.anytls.tls.server_name.label')}</Label>
          <input
            className={cn(inputCls, 'font-mono text-xs')}
            value={value.tls.server_name}
            onChange={(e) => patchTls({ server_name: e.target.value })}
            placeholder={t('server.dynamic_form.anytls.tls.server_name.placeholder')}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5">
          <Label>{t('server.dynamic_form.anytls.tls.allow_insecure')}</Label>
          <Switch
            checked={value.tls.allow_insecure}
            onCheckedChange={(allow_insecure) => patchTls({ allow_insecure })}
          />
        </div>
      </div>

      <div className="xb-stack-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{t('server.dynamic_form.anytls.padding_scheme.label')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              onChange({ ...value, padding_scheme: [...ANYTLS_DEFAULT_PADDING_SCHEME] })
            }
          >
            {t('server.dynamic_form.anytls.padding_scheme.use_default')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('server.dynamic_form.anytls.padding_scheme.description')}
        </p>
        <textarea
          className={cn(textareaCls, 'min-h-[120px] font-mono text-xs')}
          value={value.padding_scheme.join('\n')}
          onChange={(e) => {
            const padding_scheme = e.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
            onChange({ ...value, padding_scheme })
          }}
          placeholder={t('server.dynamic_form.anytls.padding_scheme.placeholder')}
        />
      </div>
    </div>
  )
}

export const PROTOCOL_FIELD_TYPES = new Set([
  'shadowsocks',
  'vmess',
  'trojan',
  'vless',
  'hysteria',
  'tuic',
  'anytls',
])

type Props = {
  type: string
  value: ProtocolFormSettings
  onChange: (next: ProtocolFormSettings) => void
}

export function ServerProtocolFields({ type, value, onChange }: Props) {
  if (type === 'shadowsocks') {
    return (
      <ShadowsocksFields
        value={value as ShadowsocksProtocolForm}
        onChange={onChange as (next: ShadowsocksProtocolForm) => void}
      />
    )
  }
  if (type === 'vmess') {
    return (
      <VmessFields
        value={value as VmessProtocolForm}
        onChange={onChange as (next: VmessProtocolForm) => void}
      />
    )
  }
  if (type === 'trojan') {
    return (
      <TrojanFields
        value={value as TrojanProtocolSettings}
        onChange={onChange as (next: TrojanProtocolSettings) => void}
      />
    )
  }
  if (type === 'vless') {
    return (
      <VlessFields
        value={value as VlessProtocolSettings}
        onChange={onChange as (next: VlessProtocolSettings) => void}
      />
    )
  }
  if (type === 'hysteria') {
    return (
      <HysteriaFields
        value={value as HysteriaProtocolSettings}
        onChange={onChange as (next: HysteriaProtocolSettings) => void}
      />
    )
  }
  if (type === 'tuic') {
    return (
      <TuicFields
        value={value as TuicProtocolSettings}
        onChange={onChange as (next: TuicProtocolSettings) => void}
      />
    )
  }
  if (type === 'anytls') {
    return (
      <AnyTlsFields
        value={value as AnyTlsProtocolSettings}
        onChange={onChange as (next: AnyTlsProtocolSettings) => void}
      />
    )
  }
  return null
}
