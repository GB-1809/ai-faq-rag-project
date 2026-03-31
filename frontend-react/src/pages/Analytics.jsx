import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Database, TrendingUp, Users, Zap, HelpCircle, Trophy } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function MetricCard({ icon: Icon, label, value, sub, color='text-indigo-400', delay=0 }) {
  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay}}
      className="metric-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center ${color}`}>
          <Icon size={18}/>
        </div>
      </div>
    </motion.div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)

  const [error, setError] = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/analytics`)
      .then(r => setData(r.data))
      .catch((e)=>{
        console.error(e)
        setError(true)
      })
  }, [])

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-red-400">Failed to load analytics. Please check backend connection.</div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400 animate-pulse">Loading analytics…</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-0.5">Knowledge base performance overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard icon={Database}     label="Total FAQs"       value={data.total_faqs}        color="text-indigo-400"  delay={0}   />
        <MetricCard icon={MessageSquare} label="Questions Asked" value={data.total_questions}    color="text-sky-400"     delay={0.05}/>
        <MetricCard icon={TrendingUp}   label="FAQ Hit Rate"     value={`${data.faq_hit_rate_pct}%`} color="text-emerald-400" delay={0.1}/>
        <MetricCard icon={Users}        label="Unique Users"     value={data.unique_users}       color="text-purple-400"  delay={0.15}/>
        <MetricCard icon={Zap}          label="Avg Response"     value={`${data.avg_response_time_ms}ms`} color="text-amber-400" delay={0.2}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-amber-400"/>
            <h2 className="font-semibold text-white">Top Asked Questions</h2>
          </div>
          {data.top_queries.length === 0
            ? <p className="text-slate-500 text-sm">No data yet</p>
            : (
            <div className="space-y-2">
              {data.top_queries.map((q, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{q.query}</p>
                  </div>
                  <span className="badge badge-indigo">{q.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Unanswered */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-red-400"/>
            <h2 className="font-semibold text-white">Top Unanswered (LLM Fallback)</h2>
          </div>
          {data.top_unanswered.length === 0
            ? <p className="text-slate-500 text-sm">No unanswered questions 🎉</p>
            : (
            <div className="space-y-2">
              {data.top_unanswered.map((q, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{q.query}</p>
                  </div>
                  <span className="badge badge-red">{q.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQ Ranking */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-indigo-400"/>
            <h2 className="font-semibold text-white">Most Used FAQs</h2>
          </div>
          {data.faq_ranking.filter(f=>f.hits>0).length === 0
            ? <p className="text-slate-500 text-sm">No FAQ hits yet</p>
            : (
            <table className="tbl">
              <thead><tr><th>#</th><th>Question</th><th>Company</th><th>Hits</th></tr></thead>
              <tbody>
                {data.faq_ranking.map((f,i) => (
                  <tr key={f.id}>
                    <td className="w-8 text-slate-500">{i+1}</td>
                    <td className="max-w-xs text-xs truncate">{f.question}</td>
                    <td><span className="badge badge-indigo">{f.company}</span></td>
                    <td className="font-semibold text-indigo-300">{f.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Company breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-sky-400"/>
            <h2 className="font-semibold text-white">Questions by Company</h2>
          </div>
          {data.company_breakdown.length === 0
            ? <p className="text-slate-500 text-sm">No data yet</p>
            : (
            <div className="space-y-3">
              {data.company_breakdown.map(c => {
                const pct = data.total_questions ? Math.round(c.questions / data.total_questions * 100) : 0
                return (
                  <div key={c.company}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{c.company}</span>
                      <span className="text-slate-400">{c.questions} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8, delay:0.2}}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
