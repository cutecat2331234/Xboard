import {
  toProtocolSettingsPayload,
  type ProtocolFormSettings,
  type VmessProtocolForm,
} from '@/components/server/ServerProtocolFields'

import {
  TLS_OBJECT_NODE_TYPES,
  TRANSPORT_NETWORKS_WITH_SUBFIELDS,
  type HysteriaProtocolSettings,
  type TrojanProtocolSettings,
  type VlessProtocolSettings,
} from '@/lib/server-protocol-settings'

export type EchFormState = {
  key: string
  config: string
  query_server_name: string
}

const MANAGED_TOP_LEVEL_KEYS: Record<string, readonly string[]> = {
  shadowsocks: ['cipher', 'plugin', 'plugin_opts', 'client_fingerprint', 'obfs', 'obfs_settings'],
  vmess: ['tls', 'network', 'tls_settings', 'network_settings'],
  trojan: ['tls', 'network', 'tls_settings', 'reality_settings', 'network_settings'],
  vless: ['tls', 'network', 'flow', 'tls_settings', 'reality_settings', 'encryption', 'network_settings'],
  hysteria: ['version', 'alpn', 'obfs', 'tls', 'bandwidth'],
  tuic: ['version', 'congestion_control', 'alpn', 'udp_relay_mode', 'tls'],
  anytls: ['tls', 'padding_scheme'],
}

const TLS_CONTAINER_TYPES = new Set(['vmess', 'vless', 'trojan', 'hysteria', 'tuic', 'anytls'])

function tlsContainerKey(type: string): 'tls' | 'tls_settings' {
  return TLS_OBJECT_NODE_TYPES.has(type) ? 'tls' : 'tls_settings'
}

function readTlsContainer(settings: Record<string, unknown>, key: 'tls' | 'tls_settings') {
  const raw = settings[key]
  return typeof raw === 'object' && raw != null && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {}
}

function readEchFromContainer(settings: Record<string, unknown>, key: 'tls' | 'tls_settings') {
  const ech = readTlsContainer(settings, key).ech
  return typeof ech === 'object' && ech != null && !Array.isArray(ech)
    ? { ...(ech as Record<string, unknown>) }
    : {}
}

function shouldApplyEchForm(type: string, formSettings: ProtocolFormSettings): boolean {
  if (TLS_OBJECT_NODE_TYPES.has(type)) return true
  if (type === 'vmess') return (formSettings as VmessProtocolForm).tls === 1
  if (type === 'trojan' || type === 'vless') {
    return (formSettings as { tls?: number }).tls === 1
  }
  return false
}

function shouldPersistTlsContainer(type: string, formSettings: ProtocolFormSettings): boolean {
  if (TLS_OBJECT_NODE_TYPES.has(type)) return true
  if (type === 'vmess') return (formSettings as VmessProtocolForm).tls === 1
  if (type === 'trojan' || type === 'vless') {
    return (formSettings as { tls?: number }).tls === 1
  }
  return false
}

function mergeEchIntoContainer(
  container: Record<string, unknown>,
  baseEch: Record<string, unknown>,
  formEch: EchFormState,
  applyFormEch: boolean,
) {
  const hasBaseEch = Object.entries(baseEch).some(([, value]) => value != null && value !== '')
  const hasFormEch =
    applyFormEch && Boolean(formEch.key || formEch.config || formEch.query_server_name)

  if (!hasBaseEch && !hasFormEch) {
    delete container.ech
    return
  }

  const mergedEch: Record<string, unknown> = { ...baseEch }
  if (hasFormEch) {
    mergedEch.key = formEch.key || undefined
    mergedEch.config = formEch.config || undefined
    mergedEch.query_server_name = formEch.query_server_name || undefined
  }

  if (Object.values(mergedEch).every((value) => value == null || value === '')) {
    delete container.ech
    return
  }

  container.ech = mergedEch
}

function mergeTlsContainer(
  type: string,
  result: Record<string, unknown>,
  base: Record<string, unknown>,
  serialized: Record<string, unknown>,
  formSettings: ProtocolFormSettings,
  echForm: EchFormState,
) {
  if (!shouldPersistTlsContainer(type, formSettings)) return

  const key = tlsContainerKey(type)
  const merged = {
    ...readTlsContainer(base, key),
    ...readTlsContainer(serialized, key),
  }

  mergeEchIntoContainer(
    merged,
    readEchFromContainer(base, key),
    echForm,
    shouldApplyEchForm(type, formSettings),
  )

  result[key] = merged
}

function applyProtocolSpecificCleanup(
  type: string,
  formSettings: ProtocolFormSettings,
  result: Record<string, unknown>,
) {
  if (type === 'vmess') {
    const vm = formSettings as VmessProtocolForm
    if (vm.tls !== 1) delete result.tls_settings
    if (!TRANSPORT_NETWORKS_WITH_SUBFIELDS.has(vm.network)) {
      delete result.network_settings
    }
  }

  if (type === 'vless' || type === 'trojan') {
    const tls = Number((formSettings as { tls?: number }).tls ?? 0)
    if (tls !== 1) delete result.tls_settings
    if (tls !== 2) delete result.reality_settings
  }

  if (type === 'vless') {
    const vless = formSettings as VlessProtocolSettings
    if (!vless.encryption.enabled) delete result.encryption
    if (!TRANSPORT_NETWORKS_WITH_SUBFIELDS.has(vless.network)) {
      delete result.network_settings
    }
  }

  if (type === 'trojan') {
    const trojan = formSettings as TrojanProtocolSettings
    if (!TRANSPORT_NETWORKS_WITH_SUBFIELDS.has(trojan.network)) {
      delete result.network_settings
    }
  }

  if (type === 'hysteria') {
    const hysteria = formSettings as HysteriaProtocolSettings
    if (hysteria.version !== 1) delete result.alpn
  }
}

/**
 * Merge persisted protocol_settings with form serialization without dropping nested
 * sub-fields (ECH, multiplex, utls, etc.) or leaving stale transport/TLS keys.
 */
export function buildProtocolSettingsForSave(
  type: string,
  base: Record<string, unknown> | undefined,
  formSettings: ProtocolFormSettings,
  echForm: EchFormState,
): Record<string, unknown> {
  const baseSettings = base ?? {}
  const serialized = toProtocolSettingsPayload(type, formSettings)
  const managed = new Set(MANAGED_TOP_LEVEL_KEYS[type] ?? [])

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(baseSettings)) {
    if (!managed.has(key)) {
      result[key] = value
    }
  }

  for (const [key, value] of Object.entries(serialized)) {
    if (!managed.has(key) || value === undefined) continue
    result[key] = value
  }

  if (TLS_CONTAINER_TYPES.has(type)) {
    mergeTlsContainer(type, result, baseSettings, serialized, formSettings, echForm)
  }

  applyProtocolSpecificCleanup(type, formSettings, result)
  return result
}
