import { createContext, useContext } from 'react'

export const THEME_STORAGE_KEY = 'peoplepay360-theme'
export const ThemeContext = createContext(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider.')
  return context
}
