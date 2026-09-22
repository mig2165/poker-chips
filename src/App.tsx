import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LobbyPage from './pages/LobbyPage'
import TablePage from './pages/TablePage'
import SettingsPage from './pages/SettingsPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import AuthPage from './pages/AuthPage'
import SpectatePage from './pages/SpectatePage'
import FriendsPage from './pages/FriendsPage'
import HandDeciderPage from './pages/HandDeciderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/spectate/:roomCode" element={<SpectatePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/hand-decider" element={<HandDeciderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
