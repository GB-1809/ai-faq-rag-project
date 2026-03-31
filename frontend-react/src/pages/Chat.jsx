import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Send, Copy, Check, Bot, User, BookOpen, FileText, Cpu,
  ChevronLeft, ChevronRight, Trash2, Clock, Building2, Sparkles,
  RefreshCw, ChevronDown, X, Mic, MicOff, Volume2, VolumeX, Globe
} from 'lucide-react'
import AIExpansionCard from '../components/AIExpansionCard'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import Joyride, { STATUS } from 'react-joyride'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const getUser    = () => { try { return JSON.parse(localStorage.getItem('faq_user'))    } catch { return null } }
const getCompany = () => localStorage.getItem('faq_company') || 'All'
const HIST_KEY   = 'faq_chat_history'
const MAX_CHARS  = 500

const loadLocalHistory = () => { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || [] } catch { return [] } }
const saveLocalHistory  = (h) => localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-100)))

const SOURCE_BADGE = {
  faq:      { label: '📚 From FAQ',      cls: 'badge-indigo' },
  document: { label: '📄 From Document', cls: 'badge-green'  },
  llm:      { label: '🤖 AI Generated',  cls: 'badge-yellow' },
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  if (!score || score <= 0) return null
  const pct = Math.round(Math.min(score, 1.0) * 100)
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 55 ? 'text-amber-400' : 'text-red-400'
  return (
    <span className={`text-[10px] font-semibold ${color} flex items-center gap-0.5`}>
      ✦ {pct}% confidence
    </span>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all bg-slate-800/80 backdrop-blur shadow-sm"
      title="Copy Answer"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

// ── TTS Button (multilingual) ─────────────────────────────────────────────────
function TTSButton({ text, lang = 'en' }) {
  const [speaking, setSpeaking] = useState(false)

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    } else {
      window.speechSynthesis.cancel() // clear queue
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
      setSpeaking(true)
    }
  }

  // Cleanup on unmount
  useEffect(() => { return () => { if (speaking) window.speechSynthesis.cancel() } }, [speaking])

  return (
    <button
      onClick={toggleSpeech}
      className={`p-1.5 rounded-lg transition-all backdrop-blur shadow-sm ${speaking ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700 bg-slate-800/80'}`}
      title={speaking ? "Stop Speaking" : "Read Aloud"}
    >
      {speaking ? <VolumeX size={14} className="animate-pulse" /> : <Volume2 size={14} />}
    </button>
  )
}

// ── Smart Follow-up Chips ─────────────────────────────────────────────────────
const COMMON_FOLLOWUPS = [
  "Can you explain that more?",
  "How long does it take?",
  "What is the policy for this?",
  "Give me an example.",
  "Where can I find more details?"
]

function FollowUpChips({ onSelect }) {
  // Randomly pick 3 from the list to simulate contextual suggestions
  const [chips] = useState(() => [...COMMON_FOLLOWUPS].sort(() => 0.5 - Math.random()).slice(0, 3))
  return (
    <div className="flex flex-wrap gap-2 mt-3 pl-1">
      {chips.map(c => (
        <motion.button
          key={c}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(c)}
          className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition-colors shadow-sm"
        >
          {c}
        </motion.button>
      ))}
    </div>
  )
}

// ── Code block ────────────────────────────────────────────────────────────────
const CodeBlock = ({ className, children }) => {
  const lang = /language-(\w+)/.exec(className || '')?.[1]
  return lang ? (
    <SyntaxHighlighter style={oneDark} language={lang} PreTag="div" className="!rounded-xl !text-sm !my-4 !bg-slate-950 !border !border-slate-800 shadow-inner">
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className="bg-slate-950/80 border border-slate-800 text-indigo-300 px-1.5 py-0.5 rounded-md text-sm font-mono">{children}</code>
  )
}

// ── Timestamp ─────────────────────────────────────────────────────────────────
function Timestamp({ ts }) {
  if (!ts) return null
  const d = new Date(ts)
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return (
    <span className="text-[10px] text-slate-600 mt-1 px-1">
      {((h % 12) || 12)}:{m} {ampm}
    </span>
  )
}

// ── Source Viewer Modal ───────────────────────────────────────────────────────
function SourceModal({ sourceFile, context, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-white">{sourceFile || 'Source Document'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {context || 'No additional context available.'}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Chat component ───────────────────────────────────────────────────────
export default function Chat() {
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [history,     setHistory]     = useState(loadLocalHistory)
  const [histOpen,    setHistOpen]    = useState(false)
  const [company,     setCompany]     = useState(getCompany)
  const [sourceModal, setSourceModal] = useState(null)    // { sourceFile, context }
  const [isExplaining, setIsExplaining] = useState(false) // lock parallel explains
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [languageMode, setLanguageMode] = useState('auto')  // 'auto' | 'en' | 'hi'
  const [detectedLang, setDetectedLang] = useState('en')    // language of last response

  // Joyride state
  const [runTour, setRunTour] = useState(false)

  // Speech Recognition state
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition()

  const messagesEndRef  = useRef(null)
  const messagesAreaRef = useRef(null)
  const user = getUser()

  // Onboarding Tour logic
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('faq_tour_seen')
    if (!hasSeenTour) {
      setTimeout(() => setRunTour(true), 1500)
    }
  }, [])

  const handleTourCallback = (data) => {
    const { status } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false)
      localStorage.setItem('faq_tour_seen', 'true')
    }
  }

  const tourSteps = [
    { target: '.tour-chat-input',   content: 'Welcome! Ask any question here to search the knowledge base or use AI.', placement: 'top' },
    { target: '.tour-mic-btn',      content: 'You can also use your voice to ask questions!', placement: 'top' },
    { target: '.tour-history-btn',  content: 'Access all your past conversations here.', placement: 'right' }
  ]

  // Sync Voice Transcript to Input
  useEffect(() => {
    if (listening && transcript) setInput(transcript)
  }, [transcript, listening])

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening()
    } else {
      resetTranscript()
      const speechLang = languageMode === 'hi' ? 'hi-IN' : 'en-US'
      SpeechRecognition.startListening({ continuous: true, language: speechLang })
    }
  }

  // Sync company from topbar
  useEffect(() => {
    const update = () => setCompany(getCompany())
    window.addEventListener('company-change', update)
    return () => window.removeEventListener('company-change', update)
  }, [])

  // Auto scroll (only if near bottom)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const area = messagesAreaRef.current
    if (!area) return
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight
    if (distFromBottom < 120) {
      scrollToBottom()
      setShowScrollBtn(false)
    } else {
      setShowScrollBtn(true)
    }
  }, [messages, scrollToBottom])

  const handleScroll = () => {
    const area = messagesAreaRef.current
    if (!area) return
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }

  // Send message
  const sendMessage = useCallback(async (overrideInput) => {
    const q = (overrideInput ?? input).trim()
    if (!q || streaming) return
    if (listening) SpeechRecognition.stopListening()
    setInput('')
    setStreaming(true)

    const userMsg = { role: 'user', text: q, id: Date.now(), ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const histCtx = history.slice(-3).map(h => ({ question: h.question, answer: h.answer }))
    const histParam = encodeURIComponent(JSON.stringify(histCtx))
    const url = `${API}/api/chat_stream?query=${encodeURIComponent(q)}&company=${encodeURIComponent(company)}&user_id=${encodeURIComponent(user?.username||'anonymous')}&history=${histParam}&language_mode=${encodeURIComponent(languageMode)}`

    const aiMsgId = Date.now() + 1
    const aiMsg = {
      role: 'ai', text: '', source: 'llm', matched_faq: null,
      source_file: null, score: 0, confidence: 0,
      id: aiMsgId, streaming: true,
      showExpansionCard: false, expansionDismissed: false,
      ts: new Date().toISOString(),
    }
    setMessages(prev => [...prev, aiMsg])

    try {
      const es = new EventSource(url)
      let fullText = ''
      let meta = {}

      es.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.type === 'meta') {
          meta = data
          if (data.language) setDetectedLang(data.language)
          setMessages(prev => prev.map(m => m.id === aiMsgId
            ? { ...m, source: data.source, matched_faq: data.matched_faq,
                source_file: data.source_file, score: data.score,
                confidence: data.confidence, cached: data.cached,
                language: data.language || 'en' }
            : m
          ))
        } else if (data.type === 'token') {
          fullText += data.text
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m))
        } else if (data.type === 'replace') {
          // Hindi translation arrived — replace streamed English with translated Hindi
          fullText = data.text
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m))
        } else if (data.type === 'done') {
          const src = meta.source || 'llm'
          setMessages(prev => prev.map(m => m.id === aiMsgId
            ? { ...m, streaming: false, showExpansionCard: src !== 'llm' && !m.expansionDismissed }
            : m
          ))
          es.close()
          setStreaming(false)
          const record = {
            id: Date.now(), question: q, answer: fullText,
            company, source: meta.source || 'llm',
            timestamp: new Date().toISOString()
          }
          const newHist = [...history, record]
          setHistory(newHist)
          saveLocalHistory(newHist)
        }
      }
      es.onerror = () => {
        es.close()
        setStreaming(false)
        setMessages(prev => prev.map(m => m.id === aiMsgId
          ? { ...m, text: m.text || '[Connection error. Is the backend running?]', streaming: false }
          : m
        ))
      }
    } catch (err) {
      console.error(err)
      setStreaming(false)
    }
  }, [input, streaming, history, company, user, languageMode])

  // Explain with AI
  const handleExplain = useCallback(async (msg) => {
    if (isExplaining) return
    setIsExplaining(true)

    // Hide the card immediately
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, showExpansionCard: false, expansionDismissed: true } : m
    ))

    try {
      const res = await fetch(`${API}/api/expand_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg.matched_faq?.question || '', answer: msg.text }),
      })
      const data = await res.json()
      const explanationMsg = {
        role: 'ai', text: data.explanation || '[No explanation returned]',
        source: 'llm', matched_faq: null, source_file: null,
        score: 0, confidence: 0,
        id: Date.now(), streaming: false,
        showExpansionCard: false, expansionDismissed: true,
        ts: new Date().toISOString(),
        isExpansion: true,
      }
      setMessages(prev => [...prev, explanationMsg])
    } catch (e) {
      console.error(e)
    } finally {
      setIsExplaining(false)
    }
  }, [isExplaining])

  // Regenerate LLM answer
  const handleRegenerate = useCallback((msg) => {
    const q = history.findLast?.(h => h.answer === msg.text)?.question
      || messages[messages.indexOf(messages.find(m => m.id === msg.id)) - 1]?.text
    if (q) sendMessage(q)
  }, [history, messages, sendMessage])

  const clearHistory = () => { setHistory([]); saveLocalHistory([]) }

  // Highlight query keywords in answer text (only for faq/doc sources)
  const HighlightedMarkdown = ({ text, query, source }) => {
    if (source === 'llm' || !query) {
      return (
        <ReactMarkdown components={{ code: CodeBlock }}>{text || '…'}</ReactMarkdown>
      )
    }
    // Only highlight if query is simple (no markdown injection risk)
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    if (!words.length) {
      return <ReactMarkdown components={{ code: CodeBlock }}>{text || '…'}</ReactMarkdown>
    }
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    const highlighted = text.replace(regex, '**$1**')
    return <ReactMarkdown components={{ code: CodeBlock }}>{highlighted || '…'}</ReactMarkdown>
  }

  // Find user message before any AI message for highlight context
  const getUserQueryFor = (msgId) => {
    const idx = messages.findIndex(m => m.id === msgId)
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].text
    }
    return ''
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 relative">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#6366f1', zIndex: 100, backgroundColor: '#1e293b',
            textColor: '#f8fafc', arrowColor: '#1e293b'
          }
        }}
      />


      {/* Background ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* ── Chat Area ── */}
      <div className="flex flex-col flex-1 min-w-0 z-10 relative overflow-hidden">

        {/* Messages — scrollable */}
        <div
          ref={messagesAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 md:px-8 pt-32 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4"
            >
              <div className="relative mb-2">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-blob" />
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center relative shadow-2xl shadow-indigo-500/10">
                  <Sparkles size={40} className="text-indigo-400" />
                </div>
                <div className="absolute -top-3 -right-3 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🤖</div>
                <div className="absolute -bottom-2 -left-3 text-xl animate-bounce" style={{ animationDelay: '0.5s' }}>✨</div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                  {user?.role === 'admin' ? '👋 Admin Dashboard' : '💬 Ask Me Anything'}
                </h2>
                <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
                  {user?.role === 'admin'
                    ? 'Manage FAQs, view analytics, and chat with the AI system.'
                    : `Intelligent answers from the ${company === 'All' ? 'Amazon, Flipkart & Myntra' : company} knowledge base.`
                  }
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                {['📚 FAQ Search', '🔍 Hybrid RAG', '⚡ Instant Answers'].map(pill => (
                  <span key={pill} className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 text-xs font-medium">{pill}</span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto mt-4">
                {[
                  { q: 'How to track my Amazon order?',  emoji: '📦' },
                  { q: 'What is the return policy?',     emoji: '↩️' },
                  { q: 'How to reset my password?',      emoji: '🔑' },
                  { q: 'How to cancel a Flipkart order?',emoji: '❌' },
                ].map(({ q, emoji }, i) => (
                  <motion.button
                    key={q}
                    onClick={() => setInput(q)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-sm px-4 py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-xl text-slate-300 hover:text-white transition-all text-left flex items-center gap-3 group shadow-sm"
                  >
                    <span className="text-lg">{emoji}</span>
                    <span className="flex-1">{q}</span>
                    <Send size={13} className="text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, type: 'spring' }}
                className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-lg
                  ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-800 border border-slate-700'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-slate-200" />}
                </div>

                <div className={`flex flex-col gap-1.5 flex-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                  {/* Source badge + confidence */}
                  {msg.role === 'ai' && msg.source && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 flex-wrap px-1">
                      <span className={`badge ${SOURCE_BADGE[msg.source]?.cls || 'badge-slate'}`}>
                        {SOURCE_BADGE[msg.source]?.label || msg.source}
                      </span>
                      {msg.source_file && (
                        <button
                          onClick={() => setSourceModal({ sourceFile: msg.source_file, context: msg.text })}
                          className="badge badge-green flex items-center gap-1 hover:bg-emerald-900/30 transition-colors cursor-pointer"
                        >
                          <FileText size={10} /> {msg.source_file}
                        </button>
                      )}
                      {msg.cached && (
                        <span className="badge badge-slate flex items-center gap-1">
                          <Clock size={9} /> cached
                        </span>
                      )}
                      {msg.isExpansion && (
                        <span className="badge badge-yellow">🧠 AI Explanation</span>
                      )}
                      <ConfidenceBadge score={msg.score} />
                    </motion.div>
                  )}

                  {/* Bubble */}
                  <div className={`relative group w-full ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                    <div className={`${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} text-[15px] leading-relaxed relative
                      ${msg.role === 'ai' ? 'shadow-indigo-500/10 shadow-md' : ''}`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className={`prose-chat`}>
                          {!msg.text && msg.streaming ? (
                            <div className="flex items-center gap-1.5 h-6 px-1">
                              <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-2 h-2 rounded-full bg-indigo-400" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 rounded-full bg-indigo-400" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 rounded-full bg-indigo-400" />
                            </div>
                          ) : (
                            <HighlightedMarkdown
                              text={msg.text}
                              query={getUserQueryFor(msg.id)}
                              source={msg.source}
                            />
                          )}
                        </div>
                      )}

                      {/* Copy & TTS btns */}
                      {!msg.streaming && msg.text && (
                        <div className={`absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1
                          ${msg.role === 'user' ? '-left-12' : '-right-20'}`}>
                          {msg.role === 'ai' && <TTSButton text={msg.text} lang={msg.language || detectedLang} />}
                          <CopyButton text={msg.text} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp + Regenerate */}
                  <div className={`flex items-center gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Timestamp ts={msg.ts} />
                    {msg.role === 'ai' && msg.source === 'llm' && !msg.streaming && !msg.isExpansion && (
                      <motion.button
                        onClick={() => handleRegenerate(msg)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
                      >
                        <RefreshCw size={10} /> Regenerate
                      </motion.button>
                    )}
                  </div>

                  {/* AI Expansion Card */}
                  {msg.role === 'ai' && msg.showExpansionCard && !msg.streaming && (
                    <div className="w-full max-w-lg tour-expand-card">
                      <AIExpansionCard
                        question={msg.matched_faq?.question || ''}
                        answer={msg.text}
                        loading={isExplaining}
                        onExplain={() => handleExplain(msg)}
                        onDismiss={() => setMessages(prev => prev.map(m =>
                          m.id === msg.id ? { ...m, showExpansionCard: false, expansionDismissed: true } : m
                        ))}
                      />
                    </div>
                  )}

                  {/* Smart Follow-ups */}
                  {msg.role === 'ai' && !msg.streaming && !msg.showExpansionCard && (
                    <FollowUpChips onSelect={(q) => sendMessage(q)} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Scroll to bottom indicator */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => { scrollToBottom(); setShowScrollBtn(false) }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                         px-4 py-2 rounded-full bg-slate-800 border border-slate-600/50
                         text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-lg"
            >
              <ChevronDown size={14} className="animate-bounce" /> New messages
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Input bar ── */}
        <div className="px-4 md:px-8 pb-5 pt-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent shrink-0">
          <div className="max-w-3xl mx-auto relative group">
            {/* Glow border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 group-focus-within:opacity-50 transition duration-500" />

            <div className="relative flex items-end gap-3 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 shadow-2xl">
              {/* Company chip */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/70 rounded-lg text-xs font-semibold text-slate-400 flex-shrink-0 border border-slate-700/50 mb-1 tour-company-select">
                <Building2 size={13} className="text-indigo-400" />
                <span>{company}</span>
              </div>

              {/* 🌐 Language Mode Dropdown */}
              <div className="relative flex items-center gap-1.5 flex-shrink-0 mb-1">
                <Globe size={13} className="text-emerald-400" />
                <select
                  value={languageMode}
                  onChange={e => setLanguageMode(e.target.value)}
                  className="bg-slate-800/70 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-400 pl-1 pr-6 py-1.5 appearance-none cursor-pointer hover:text-white hover:border-emerald-500/40 transition-colors outline-none focus:border-emerald-500/60"
                  title="Language Mode"
                >
                  <option value="auto">🌐 Auto</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="hi">🇮🇳 हिंदी</option>
                </select>
              </div>

              <div className="flex-1 flex flex-col tour-chat-input">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                  placeholder="Ask anything about orders, returns, accounts..."
                  disabled={streaming}
                  rows={1}
                  maxLength={MAX_CHARS}
                  className="flex-1 bg-transparent text-[15px] text-slate-100 placeholder-slate-500 outline-none resize-none py-1.5 max-h-32"
                  style={{ fieldSizing: 'content' }}
                />
                {/* Char counter */}
                {input.length > 0 && (
                  <span className={`text-[10px] self-end mt-0.5 transition-colors ${input.length >= MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-slate-600'}`}>
                    {input.length}/{MAX_CHARS}
                  </span>
                )}
              </div>

              {/* Mic Button */}
              {browserSupportsSpeechRecognition && (
                <motion.button
                  onClick={toggleListening}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 mb-0.5 tour-mic-btn
                    ${listening 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                  {listening ? <Mic size={16} /> : <MicOff size={16} />}
                </motion.button>
              )}

              <motion.button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !listening) || streaming}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white
                           disabled:opacity-40 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex-shrink-0 mb-0.5"
              >
                {streaming
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={16} />
                }
              </motion.button>
            </div>
            <p className="text-[11px] text-slate-600 font-medium text-center mt-2 tracking-wide">
              ↵ Enter to send &nbsp;·&nbsp; Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>

      {/* ── History Panel ── */}
      <AnimatePresence initial={false}>
        {histOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden flex-shrink-0 shadow-2xl z-20 tour-history-btn"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <span className="text-sm font-bold text-slate-200 tracking-wide">Recent Chats</span>
                {history.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">{history.length}</span>
                )}
              </div>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all" title="Clear History">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {history.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-center text-slate-500">
                  <div className="text-4xl mb-3 opacity-40">🗂️</div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs text-slate-600 mt-1">Your chats will appear here</p>
                </div>
              )}
              {[...history].reverse().map(h => (
                <button
                  key={h.id}
                  onClick={() => setInput(h.question)}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-800 border border-transparent hover:border-indigo-500/20 transition-all group"
                >
                  <p className="text-[13px] text-slate-300 font-medium line-clamp-2 leading-snug group-hover:text-white transition-colors">{h.question}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{h.company}</span>
                    <span className="text-[10px] text-slate-600">{SOURCE_BADGE[h.source]?.label?.split(' ')[0]}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* History toggle */}
      <div className={`absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${histOpen ? 'right-[280px]' : 'right-0'}`}>
        <button
          onClick={() => setHistOpen(!histOpen)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-l-lg border-y border-l border-slate-700 shadow-xl transition-colors tour-history-btn"
          title={histOpen ? 'Hide History' : 'Show History'}
        >
          {histOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Source Viewer Modal */}
      <AnimatePresence>
        {sourceModal && (
          <SourceModal
            sourceFile={sourceModal.sourceFile}
            context={sourceModal.context}
            onClose={() => setSourceModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
