/** Design tokens extracted from 7001 ui-spec (legacy dist). */
export const tokens = {
  colors: {
    primary: '#2d6565',
    primaryHover: '#245252',
    pageBg: '#f0f2f5',
    shellBg: '#ffffff',
    mainBg: '#f5f7fa',
    text: '#333333',
    textMuted: '#666666',
    border: '#e5e7eb',
    link: '#2080f0',
    danger: '#d03050',
  },
  radius: {
    card: '8px',
    button: '4px',
  },
  shadow: {
    card: '0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)',
    authCard: '0 2px 8px rgba(0, 0, 0, 0.15)',
    header: '0 1px 4px rgba(0, 21, 41, 0.08)',
  },
  spacing: {
    shellSideWidth: '220px',
    headerHeight: '56px',
  },
} as const
