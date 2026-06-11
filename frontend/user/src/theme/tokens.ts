/** Design tokens aligned with 7001 ui-spec computed-styles. */
export const tokens = {
  colors: {
    primary: '#316C72FF',
    primaryHover: '#316C72E3',
    primaryPressed: '#2B4C59FF',
    pageBg: '#f2f2f2',
    shellBg: '#ffffff',
    mainBg: '#f2f2f2',
    text: '#333333',
    textMuted: '#666666',
    border: '#e5e7eb',
    link: '#2080f0',
    danger: '#d03050',
  },
  radius: {
    card: '6px',
    button: '3px',
  },
  shadow: {
    card: 'none',
    authCard: 'none',
    header: '0 1px 4px rgba(0, 21, 41, 0.08)',
  },
  spacing: {
    shellSideWidth: '220px',
    headerHeight: '60px',
  },
} as const
