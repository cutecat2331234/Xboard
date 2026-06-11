import type { GlobalThemeOverrides } from 'naive-ui'
import { getThemePalette } from '@/lib/theme'
import { tokens } from './tokens'

function buildThemeOverrides(color?: string): GlobalThemeOverrides {
  const palette = getThemePalette(color)
  const { primary, hover, pressed } = palette

  return {
    common: {
      primaryColor: primary,
      primaryColorHover: hover,
      primaryColorPressed: pressed,
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
      caretColor: primary,
      borderHover: `1px solid ${hover}`,
      borderFocus: `1px solid ${hover}`,
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
      textColorInfo: primary,
      textColorHoverInfo: primary,
      textColorPressedInfo: primary,
      textColorFocusInfo: primary,
      borderInfo: `1px solid ${primary}`,
      borderHoverInfo: `1px solid ${hover}`,
      borderPressedInfo: `1px solid ${pressed}`,
      borderFocusInfo: `1px solid ${hover}`,
      colorInfo: '#0000',
      colorHoverInfo: 'rgba(46, 51, 56, .09)',
      colorPressedInfo: 'rgba(46, 51, 56, .13)',
      colorFocusInfo: 'rgba(46, 51, 56, .09)',
      colorDisabledInfo: '#0000',
      textColorDisabledInfo: primary,
      borderDisabledInfo: `1px solid ${primary}`,
      rippleColorInfo: '#0000',
    },
  }
}

export function getThemeOverrides(color?: string): GlobalThemeOverrides {
  return buildThemeOverrides(color)
}

export const themeOverrides = buildThemeOverrides()
