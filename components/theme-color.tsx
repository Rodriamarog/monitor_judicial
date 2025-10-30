'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export function ThemeColor() {
  const { theme, systemTheme } = useTheme()

  useEffect(() => {
    // Get the actual theme (considering system preference)
    const currentTheme = theme === 'system' ? systemTheme : theme

    // Update meta theme-color tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')

    if (metaThemeColor) {
      // Dark mode: use dark background color
      // Light mode: use light background color
      metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#18181b' : '#ffffff')
    }
  }, [theme, systemTheme])

  return null
}
