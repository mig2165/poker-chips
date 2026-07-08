import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LobbyPage from './pages/LobbyPage'
import TablePage from './pages/TablePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
