import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Table, CheckCircle, AlertCircle, X, FileUp, Trash2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const COMPANIES = ['All', 'Amazon', 'Flipkart', 'Myntra']

function DropZone({ accept, label, icon: Icon, onFile }) {
  const [over, setOver] = useState(false)
  const ref = useRef()
  return (
    <div
      onDragOver={e=>{e.preventDefault();setOver(true)}}
      onDragLeave={()=>setOver(false)}
      onDrop={e=>{e.preventDefault();setOver(false);onFile(e.dataTransfer.files[0])}}
      onClick={()=>ref.current.click()}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer
        transition-colors ${over ? 'border-indigo-500 bg-indigo-900/10' : 'border-slate-600 hover:border-slate-500'}`}
    >
      <Icon size={36} className={over ? 'text-indigo-400' : 'text-slate-500'}/>
      <p className="text-sm text-slate-300 font-medium">{label}</p>
      <p className="text-xs text-slate-500">Click or drag & drop</p>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e=>onFile(e.target.files[0])}/>
    </div>
  )
}

/* ── CSV Tab ── */
function CSVImport() {
  const [rows,      setRows]      = useState([])
  const [fileName,  setFileName]  = useState('')
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)

  const parseCSV = (file) => {
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h=>h.trim())
      const rowData = lines.slice(1,6).map(l => {
        const vals = l.split(',')
        return Object.fromEntries(headers.map((h,i)=>[h, (vals[i]||'').trim()]))
      })
      setRows(rowData)
    }
    reader.readAsText(file)
  }

  const doImport = async (file) => {
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post(`${API}/api/bulk_import`, form)
      setResult({ ok: true, ...res.data })
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const [rawFile, setRawFile] = useState(null)
  const handleFile = (f) => { setRawFile(f); parseCSV(f) }

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-400 space-y-1 bg-slate-800 rounded-lg p-3 font-mono">
        <p className="text-slate-300 font-medium mb-1">Expected CSV format:</p>
        <p>question,answer,category,company,tags</p>
        <p className="text-slate-500">How to reset password?,Go to settings,Account,Amazon,password</p>
      </div>

      <DropZone accept=".csv" label="Drop CSV file here" icon={Table} onFile={handleFile}/>

      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">Preview (first 5 rows of <b className="text-slate-200">{fileName}</b>):</p>
          <div className="overflow-x-auto rounded-lg">
            <table className="tbl text-[11px]">
              <thead><tr>{Object.keys(rows[0]).map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r,i)=><tr key={i}>{Object.values(r).map((v,j)=><td key={j} className="max-w-[120px] truncate">{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <button onClick={()=>doImport(rawFile)} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Importing…' : <><Upload size={14}/> Import FAQs</>}
          </button>
        </div>
      )}

      {loading && (
        <div className="border-2 border-dashed border-indigo-500/40 rounded-xl p-8 flex flex-col items-center gap-4 bg-indigo-900/5">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          <div className="text-center space-y-1">
            <p className="text-sm text-slate-300 font-medium">Importing FAQs…</p>
            <p className="text-xs text-slate-500">Reading file → Generating embeddings → Updating index</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${result.ok ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-red-900/20 border border-red-700/40'}`}>
          {result.ok ? <CheckCircle size={18} className="text-emerald-400 mt-0.5"/> : <AlertCircle size={18} className="text-red-400 mt-0.5"/>}
          <div>
            {result.ok
              ? <>
                  <p className="text-sm text-emerald-300 font-semibold">{result.message}</p>
                  {result.duplicates > 0 && (
                    <p className="text-xs text-amber-400 mt-0.5">ℹ️ {result.duplicates} duplicate{result.duplicates > 1 ? 's' : ''} skipped</p>
                  )}
                  {result.errors?.length > 0 && (
                    <p className="text-xs text-red-400 mt-0.5">⚠️ {result.errors.length} rows had errors</p>
                  )}
                </>
              : <p className="text-sm text-red-300">{result.error}</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Document Upload Tab ── */
function DocUpload() {
  const [company,  setCompany]  = useState('Amazon')
  const [status,   setStatus]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [docs,     setDocs]     = useState([])

  const loadDocs = async () => {
    try { const r = await axios.get(`${API}/api/documents`); setDocs(r.data) } catch (e) { console.error(e) }
  }
  useEffect(()=>{ loadDocs() }, [])

  const uploadDoc = async (file) => {
    setLoading(true)
    setStatus(null)
    const form = new FormData()
    form.append('file', file)
    form.append('company', company)
    try {
      const res = await axios.post(`${API}/api/upload_document`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setStatus({ ok: true, ...res.data })
      loadDocs()
    } catch (e) {
      setStatus({ ok: false, error: e.response?.data?.detail || e.message })
    } finally {
      setLoading(false)
    }
  }

  const deleteDoc = async (id) => {
    if (!window.confirm("Drop this document from the AI knowledge base?")) return;
    try {
      await axios.delete(`${API}/api/documents/${id}`)
      loadDocs()
    } catch (e) {
      alert("Failed to delete document")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Company context</label>
        <select className="input w-48" value={company} onChange={e=>setCompany(e.target.value)}>
          {COMPANIES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          <p className="text-sm text-slate-300">Processing document…</p>
          <p className="text-xs text-slate-500">Extract → Chunk → Embed → Index</p>
        </div>
      ) : (
        <DropZone accept=".pdf,.xlsx,.xls" label="Drop PDF or Excel file here" icon={FileUp} onFile={uploadDoc}/>
      )}

      {status && (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${status.ok ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-red-900/20 border border-red-700/40'}`}>
          {status.ok ? <CheckCircle size={18} className="text-emerald-400 mt-0.5"/> : <AlertCircle size={18} className="text-red-400 mt-0.5"/>}
          <div>
            {status.ok
              ? <p className="text-sm text-emerald-300">
                  <b>{status.document?.filename}</b> indexed — <b>{status.chunks_indexed}</b> chunks stored in RAG index
                </p>
              : <p className="text-sm text-red-300">{status.error}</p>
            }
          </div>
        </div>
      )}

      {/* Indexed documents list */}
      {docs.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-3">Indexed Documents ({docs.length})</p>
          <div className="space-y-2">
            {docs.map(d=>(
              <div key={d.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5">
                <FileText size={16} className="text-indigo-400 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{d.filename}</p>
                  <p className="text-xs text-slate-500">{d.company} · {d.num_chunks} chunks</p>
                </div>
                <span className="badge badge-green text-[10px]">indexed</span>
                <button
                  onClick={() => deleteDoc(d.id)}
                  className="p-1.5 ml-1 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Delete Document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BulkImport() {
  const [tab, setTab] = useState('csv')

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bulk Import</h1>
        <p className="text-slate-400 text-sm mt-0.5">Add knowledge via CSV or upload documents (PDF / Excel)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 rounded-xl w-fit">
        {[{ id:'csv', label:'CSV Import', icon:Table }, { id:'doc', label:'Document Upload', icon:FileText }].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab===t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        {tab === 'csv' ? <CSVImport/> : <DocUpload/>}
      </motion.div>
    </div>
  )
}
