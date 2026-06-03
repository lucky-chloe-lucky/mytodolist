import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppStore'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Todos } from './pages/Todos'
import { Projects } from './pages/Projects'
import { Daily } from './pages/Daily'
import { Weekly } from './pages/Weekly'
import { Sprints } from './pages/Sprints'
import { Learn } from './pages/Learn'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'

function Gate() {
  const { authReady, cloudConfigured, user } = useApp()

  if (!authReady) {
    return (
      <div className="grid min-h-full place-items-center text-muted">
        <span className="animate-pulse text-2xl">⚡</span>
      </div>
    )
  }

  // Cloud mode requires a signed-in user; local mode goes straight through.
  if (cloudConfigured && !user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="todos" element={<Todos />} />
        <Route path="projects" element={<Projects />} />
        <Route path="daily" element={<Daily />} />
        <Route path="weekly" element={<Weekly />} />
        <Route path="sprints" element={<Sprints />} />
        <Route path="learn" element={<Learn />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AppProvider>
  )
}
