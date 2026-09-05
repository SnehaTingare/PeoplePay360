import { useEffect, useMemo, useState } from 'react'
import { THEME_STORAGE_KEY, ThemeContext } from './themeContext'

const systemTheme = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
const savedTheme = () => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'dark' || saved === 'light' ? saved : systemTheme()
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(savedTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
