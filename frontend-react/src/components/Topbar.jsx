import { useNavigate } from 'react-router-dom'
import { Search, Bell, Building2 } from 'lucide-react'

const COMPANIES = ['All', 'Amazon', 'Flipkart', 'Myntra']

const getUser = () => { try { return JSON.parse(localStorage.getItem('faq_user')) } catch { return null } }

export default function Topbar() {
  const user = getUser()
  const navigate = useNavigate()
  const company = localStorage.getItem('faq_company') || 'All'

  const setCompany = (c) => {
    localStorage.setItem('faq_company', c)
    window.dispatchEvent(new Event('company-change'))
  }

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-slate-900 border-b border-slate-700/50 flex-shrink-0 md:pl-6 pl-14">
      {/* Company selector */}
      <div className="flex items-center gap-2">
        <Building2 size={15} className="text-slate-400" />
        <select
          defaultValue={company}
          onChange={e => setCompany(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-lg px-2 py-1.5
                     focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Search (opens chat) */}
      <div className="flex-1 max-w-md hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700
                      rounded-xl px-3 py-2 cursor-text" onClick={() => navigate('/chat')}>
        <Search size={14} className="text-slate-500" />
        <span className="text-sm text-slate-500">Ask a question…</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-200 hidden sm:block">{user?.username}</span>
        </div>
      </div>
    </header>
  )
}
