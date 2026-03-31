import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Search, X, Check, Lightbulb, Tag } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const COMPANIES  = ['Amazon', 'Flipkart', 'Myntra']
const CATEGORIES = ['Orders', 'Returns', 'Billing', 'Account', 'Support', 'Products', 'General']

const EMPTY_FORM = { question: '', answer: '', category: 'General', company: 'Amazon', tags: '' }

function FAQModal({ faq, onSave, onClose }) {
  const [form, setForm]   = useState(faq ? { ...faq, tags: (faq.tags||[]).join(', ') } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
      if (faq?.id) {
        await axios.put(`${API}/api/faqs/${faq.id}`, payload)
      } else {
        await axios.post(`${API}/api/faqs`, payload)
      }
      onSave()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">{faq ? 'Edit FAQ' : 'New FAQ'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Question *</label>
            <textarea rows={2} className="input resize-none" value={form.question}
              onChange={e => setForm(f=>({...f, question:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Answer *</label>
            <textarea rows={4} className="input resize-none" value={form.answer}
              onChange={e => setForm(f=>({...f, answer:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company</label>
              <select className="input" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))}>
                {COMPANIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1"><Tag size={12} className="inline mr-1"/>Tags (comma-separated)</label>
            <input className="input" value={form.tags} placeholder="tracking, order, delivery"
              onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : <><Check size={14}/> Save FAQ</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Admin() {
  const [faqs,        setFaqs]        = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [filter,      setFilter]      = useState({ search:'', company:'', category:'' })
  const [modal,       setModal]       = useState(null)   // null | 'new' | faq object
  const [deleting,    setDeleting]    = useState(null)

  const load = useCallback(async () => {
    const [fRes, sRes] = await Promise.all([
      axios.get(`${API}/api/faqs`),
      axios.get(`${API}/api/faq_suggestions`).catch(()=>({data:[]}))
    ])
    setFaqs(fRes.data)
    setSuggestions(sRes.data)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const deleteFaq = async (id) => {
    setDeleting(id)
    await axios.delete(`${API}/api/faqs/${id}`)
    setDeleting(null)
    load()
  }

  const approveSuggestion = async (s) => {
    const answer = prompt(`Enter answer for:\n"${s.question}"`)
    if (!answer) return
    await axios.post(`${API}/api/faq_suggestions/${s.id}/approve`, {
      question: s.question, answer, category: 'General', company: 'Amazon', tags: []
    })
    load()
  }

  const dismissSuggestion = async (id) => {
    await axios.delete(`${API}/api/faq_suggestions/${id}`)
    load()
  }

  const filtered = faqs.filter(f => {
    const s = filter.search.toLowerCase()
    const matchSearch = !s || f.question.toLowerCase().includes(s) || f.answer.toLowerCase().includes(s)
    const matchCo  = !filter.company  || f.company === filter.company
    const matchCat = !filter.category || f.category === filter.category
    return matchSearch && matchCo && matchCat
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">FAQ Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">{faqs.length} FAQs in knowledge base</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus size={16}/> Add FAQ
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="card border-amber-700/40 bg-amber-900/10">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-400"/>
            <span className="text-sm font-semibold text-amber-300">Smart FAQ Suggestions ({suggestions.length})</span>
          </div>
          <div className="space-y-2">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-slate-200">{s.question}</p>
                  <p className="text-xs text-slate-500">Asked {s.count} times</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveSuggestion(s)} className="btn-primary text-xs py-1 px-2">✓ Add FAQ</button>
                  <button onClick={() => dismissSuggestion(s.id)} className="btn-danger text-xs py-1 px-2">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search FAQs…"
            value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} />
        </div>
        <select className="input w-36" value={filter.company} onChange={e=>setFilter(f=>({...f,company:e.target.value}))}>
          <option value="">All Companies</option>
          {COMPANIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="input w-36" value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value}))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Question</th>
              <th>Answer</th>
              <th>Company</th>
              <th>Category</th>
              <th>Hits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">No FAQs found</td></tr>
            )}
            <AnimatePresence>
              {filtered.map(faq => (
                <motion.tr key={faq.id} layout
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                  <td className="max-w-xs">
                    <p className="text-slate-200 font-medium text-xs line-clamp-2">{faq.question}</p>
                    {(faq.tags||[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {faq.tags.slice(0,3).map(t=>(
                          <span key={t} className="badge badge-slate text-[9px]">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs text-slate-400 text-xs line-clamp-2">{faq.answer}</td>
                  <td><span className="badge badge-indigo">{faq.company}</span></td>
                  <td><span className="badge badge-slate">{faq.category}</span></td>
                  <td className="text-slate-400 text-xs">{faq.hit_count||0}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(faq)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <Pencil size={13}/>
                      </button>
                      <button
                        onClick={() => deleting === faq.id ? deleteFaq(faq.id) : setDeleting(faq.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                        {deleting === faq.id ? <Check size={13} className="text-red-400"/> : <Trash2 size={13}/>}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <FAQModal
          faq={modal === 'new' ? null : modal}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
