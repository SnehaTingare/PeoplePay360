import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import ThemeProvider from './ThemeProvider'

export default function AppProviders({ children }) {
  return <ThemeProvider><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></ThemeProvider>
}
