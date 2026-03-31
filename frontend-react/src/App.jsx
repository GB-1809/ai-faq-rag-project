import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Login from './pages/Login'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import Analytics from './pages/Analytics'
import BulkImport from './pages/BulkImport'
import UserManagement from './pages/UserManagement'
import About from './pages/About'

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('faq_user')) } catch { return null }
}

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/chat" replace />
  return children
}

const Layout = ({ children }) => (
  <div className="flex h-[100dvh] overflow-hidden bg-slate-950 text-slate-200">
    <Sidebar />
    <div className="flex flex-col flex-1 min-w-0">
      <Topbar />
      <main className="flex-1 overflow-hidden p-0 relative">
        {children}
      </main>
    </div>
  </div>
)

const ScrollLayout = ({ children }) => (
  <div className="flex h-[100dvh] overflow-hidden bg-slate-950 text-slate-200">
    <Sidebar />
    <div className="flex flex-col flex-1 min-w-0">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-0 relative scrollbar-thin">
        {children}
      </main>
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected User Routes */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <Layout><Chat /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/about" element={
          <ProtectedRoute>
            <ScrollLayout><About /></ScrollLayout>
          </ProtectedRoute>
        } />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <ScrollLayout><Admin /></ScrollLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute adminOnly>
            <ScrollLayout><Analytics /></ScrollLayout>
          </ProtectedRoute>
        } />
        <Route path="/bulk-import" element={
          <ProtectedRoute adminOnly>
            <ScrollLayout><BulkImport /></ScrollLayout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute adminOnly>
            <ScrollLayout><UserManagement /></ScrollLayout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
