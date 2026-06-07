import type { GlobalThemeOverrides } from 'naive-ui'
import { tokens } from './tokens'

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: tokens.colors.primary,
    primaryColorHover: tokens.colors.primaryHover,
    primaryColorPressed: tokens.colors.primaryHover,
    borderRadius: tokens.radius.button,
  },
  Card: {
    borderRadius: tokens.radius.card,
    boxShadow: tokens.shadow.card,
  },
  Button: {
    borderRadius: tokens.radius.button,
  },
}
