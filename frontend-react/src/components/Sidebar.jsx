import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Database, BarChart2, Upload,
  Users, ChevronLeft, ChevronRight, Bot, LogOut, Menu, X, Info
} from 'lucide-react'

const NAV = [
  { path: '/chat',        icon: MessageSquare, label: 'Chat',           emoji: '💬', adminOnly: false },
  { path: '/about',       icon: Info,          label: 'About Us',       emoji: 'ℹ️',  adminOnly: false },
  { path: '/admin',       icon: Database,      label: 'FAQ Manager',    emoji: '🗂️',  adminOnly: true  },
  { path: '/analytics',  icon: BarChart2,      label: 'Analytics',      emoji: '📊', adminOnly: true  },
  { path: '/bulk-import', icon: Upload,        label: 'Bulk Import',    emoji: '📥', adminOnly: true  },
  { path: '/users',       icon: Users,         label: 'Users',          emoji: '👥', adminOnly: true  },
]

const getUser = () => { try { return JSON.parse(localStorage.getItem('faq_user')) } catch { return null } }

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  const links = NAV.filter(n => !n.adminOnly || user?.role === 'admin')

  const logout = () => {
    localStorage.removeItem('faq_user')
    navigate('/login')
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 z-0" />
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user?.role === 'admin' ? 'from-amber-500 to-orange-500' : 'from-indigo-500 to-purple-600'} flex items-center justify-center flex-shrink-0 z-10 shadow-lg`}>
          {user?.role === 'admin' ? <span className="text-lg">👑</span> : <Bot size={18} className="text-white" />}
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 z-10">
            <p className="text-sm font-bold text-white tracking-wide truncate">AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Assistant</span></p>
            <p className="text-[11px] font-medium tracking-wider uppercase"
              style={{ color: user?.role === 'admin' ? '#fbbf24' : '#94a3b8' }}>
              {user?.role === 'admin' ? '⚡ Admin Portal' : 'Enterprise RAG'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map(({ path, icon: Icon, label, emoji }) => {
          const active = location.pathname === path
          return (
            <motion.button
              key={path}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { navigate(path); setMobileOpen(false) }}
              className={`nav-link w-full group ${active ? 'active' : ''}`}
            >
              {collapsed
                ? <span className="text-lg">{emoji}</span>
                : <Icon size={18} className={`flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
              }
              {!collapsed && (
                <span className="truncate flex items-center gap-2 flex-1">
                  <span>{emoji}</span>
                  {label}
                </span>
              )}
              {!collapsed && active && (
                <motion.div layoutId="activeNavIndicator" className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full" />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 pb-5 border-t border-slate-800/60 pt-4 space-y-2 bg-slate-900/50">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-2 shadow-inner">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user?.role === 'admin' ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-600'} flex items-center justify-center text-xs font-bold text-white shadow-md`}>
              {user?.role === 'admin' ? '👑' : user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
              <p className={`text-[10px] font-medium uppercase tracking-wider ${user?.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                {user?.role === 'admin' ? '⚡ Administrator' : '👤 User'}
              </p>
            </div>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={logout}
          className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 group"
        >
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
          {!collapsed && <span className="font-semibold">Logout</span>}
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-slate-950 border-r border-slate-800 relative flex-shrink-0 overflow-visible shadow-2xl z-20"
      >
        {renderSidebarContent()}
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-7 -right-3.5 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-700 transition-all shadow-lg z-30"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-4 z-50 w-10 h-10 bg-slate-900/80 backdrop-blur rounded-xl flex items-center justify-center border border-slate-700 text-slate-300 shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed left-0 top-0 h-full w-[280px] bg-slate-950 border-r border-slate-800 z-50 flex flex-col shadow-2xl"
            >
              <button 
                onClick={() => setMobileOpen(false)} 
                className="absolute top-5 right-5 w-8 h-8 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50"
              >
                <X size={18} />
              </button>
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
