import type { GlobalThemeOverrides } from 'naive-ui'
import { tokens } from './tokens'

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: tokens.colors.primary,
    primaryColorHover: tokens.colors.primaryHover,
    primaryColorPressed: tokens.colors.primaryPressed,
    borderRadius: '3px',
  },
  Card: {
    borderRadius: tokens.radius.card,
    boxShadow: 'none',
  },
  Input: {
    borderRadius: '3px',
    fontSizeSmall: '14px',
    heightMedium: '34px',
    textColor: 'rgb(51, 54, 57)',
    caretColor: '#316C72FF',
    borderHover: '1px solid #316C72E3',
    borderFocus: '1px solid #316C72E3',
  },
  Alert: {
    borderRadius: '3px',
    closeBorderRadius: '3px',
  },
  Switch: {
    buttonBorderRadius: '3px',
    railBorderRadius: '3px',
  },
  Button: {
    fontWeight: '400',
    borderRadius: tokens.radius.button,
    textColorInfo: tokens.colors.primary,
    textColorHoverInfo: tokens.colors.primary,
    textColorPressedInfo: '#316C72FF',
    textColorFocusInfo: tokens.colors.primary,
    borderInfo: `1px solid ${tokens.colors.primary}`,
    borderHoverInfo: '1px solid #316C72E3',
    borderPressedInfo: '1px solid #2B4C59FF',
    borderFocusInfo: '1px solid #316C72E3',
    colorInfo: '#0000',
    colorHoverInfo: 'rgba(46, 51, 56, .09)',
    colorPressedInfo: 'rgba(46, 51, 56, .13)',
    colorFocusInfo: 'rgba(46, 51, 56, .09)',
    colorDisabledInfo: '#0000',
    textColorDisabledInfo: tokens.colors.primary,
    borderDisabledInfo: `1px solid ${tokens.colors.primary}`,
    rippleColorInfo: '#0000',
  },
}
