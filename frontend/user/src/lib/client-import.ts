import { CLIENT_ICONS } from '@/assets/client-icons'

export type ClientPlatform = 'windows' | 'mac' | 'ios' | 'android' | 'unknown'

export type ImportClient = {
  name?: string
  nameKey?: string
  platforms: ClientPlatform[]
  action: 'copy' | 'open'
  url?: string
  icon?: string
  iconClass?: string
}

export function detectPlatform(): ClientPlatform {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/macintosh|mac os/.test(ua)) return 'mac'
  if (/windows/.test(ua)) return 'windows'
  return 'unknown'
}

function base64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function appendSubscribeTypes(url: string, types: string[]): string {
  if (!url || types.length === 0 || types.includes('all')) return url
  try {
    const u = new URL(url)
    u.searchParams.set('types', types.includes('auto') ? 'auto' : types.join(','))
    return u.toString()
  } catch {
    return url
  }
}

function withIcon(client: Omit<ImportClient, 'icon' | 'iconClass'>): ImportClient {
  const icon = client.name ? CLIENT_ICONS[client.name] : undefined
  return {
    ...client,
    icon,
    iconClass: icon ? 'rounded-md' : undefined,
  }
}

export function buildImportClients(subscribeUrl: string, siteTitle = 'Xboard'): ImportClient[] {
  if (!subscribeUrl) return []
  const encoded = encodeURIComponent(subscribeUrl)
  const name = encodeURIComponent(siteTitle)
  const b64 = base64Url(subscribeUrl)

  return [
    withIcon({
      nameKey: 'dashboard.copyLink',
      platforms: ['windows', 'mac', 'ios', 'android', 'unknown'],
      action: 'copy',
    }),
    withIcon({
      name: 'Clash',
      platforms: ['windows'],
      action: 'open',
      url: `clash://install-config?url=${encoded}&name=${name}`,
    }),
    withIcon({
      name: 'Clash Meta',
      platforms: ['mac', 'android'],
      action: 'open',
      url: `clash://install-config?url=${encoded}&name=${name}`,
    }),
    withIcon({
      name: 'Hiddify',
      platforms: ['mac', 'android', 'windows', 'ios'],
      action: 'open',
      url: `hiddify://import/${subscribeUrl}#${siteTitle}`,
    }),
    withIcon({
      name: 'SingBox',
      platforms: ['android', 'mac', 'ios'],
      action: 'open',
      url: `sing-box://import-remote-profile?url=${encoded}#${name}`,
    }),
    withIcon({
      name: 'Shadowrocket',
      platforms: ['mac', 'ios'],
      action: 'open',
      url: `shadowrocket://add/sub://${b64}?remark=${name}`,
    }),
    withIcon({
      name: 'QuantumultX',
      platforms: ['mac', 'ios'],
      action: 'open',
      url: `quantumult-x:///update-configuration?remote-resource=${encodeURIComponent(
        JSON.stringify({ server_remote: [`${subscribeUrl}, tag=${siteTitle}`] }),
      )}`,
    }),
    withIcon({
      name: 'Surge',
      platforms: ['mac', 'ios'],
      action: 'open',
      url: `surge:///install-config?url=${encoded}&name=${name}`,
    }),
    withIcon({
      name: 'Stash',
      platforms: ['mac', 'ios'],
      action: 'open',
      url: `stash://install-config?url=${encoded}&name=${name}`,
    }),
    withIcon({
      name: 'NekoBox',
      platforms: ['android'],
      action: 'open',
      url: `clash://install-config?url=${encoded}&name=${name}`,
    }),
    withIcon({
      name: 'Surfboard',
      platforms: ['android'],
      action: 'open',
      url: `surfboard:///install-config?url=${encoded}&name=${name}`,
    }),
  ]
}

export function filterClientsByPlatform(clients: ImportClient[], platform: ClientPlatform): ImportClient[] {
  return clients.filter((c) => c.platforms.includes(platform) || platform === 'unknown')
}

export const PROTOCOL_TYPES = [
  { labelKey: 'dashboard.protocolTypes.auto', value: 'auto' },
  { labelKey: 'dashboard.protocolTypes.anytls', value: 'anytls' },
  { labelKey: 'dashboard.protocolTypes.vless', value: 'vless' },
  { labelKey: 'dashboard.protocolTypes.hysteria', value: 'hysteria' },
  { labelKey: 'dashboard.protocolTypes.hysteria2', value: 'hysteria2' },
  { labelKey: 'dashboard.protocolTypes.shadowsocks', value: 'shadowsocks' },
  { labelKey: 'dashboard.protocolTypes.vmess', value: 'vmess' },
  { labelKey: 'dashboard.protocolTypes.trojan', value: 'trojan' },
]
