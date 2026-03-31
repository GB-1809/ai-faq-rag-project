import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Eye, EyeOff, Brain, Sparkles, ArrowRight, Layers, Shield, Zap } from 'lucide-react'

const USERS = [
  { username: 'admin',  password: 'admin123', role: 'admin',  email: 'admin@faqsystem.com' },
  { username: 'user',   password: 'user123',  role: 'user',   email: 'user@example.com'    },
  { username: 'garvit', password: 'garvit123',role: 'user',   email: 'garvit@example.com'  },
]

const FEATURES = [
  { icon: Brain,   label: 'AI-Powered RAG',    desc: 'Semantic search with Google Gemini' },
  { icon: Zap,     label: 'Instant Answers',   desc: 'Sub-second FAQ retrieval'           },
  { icon: Shield,  label: 'Role-Based Access',  desc: 'Secure admin & user portals'        },
]

/* ── Floating particle ─────────────────────────────────────────── */
function Particle({ index }) {
  const size = Math.random() * 3 + 1
  const x = Math.random() * 100
  const duration = 8 + Math.random() * 12
  const delay = Math.random() * -20
  const opacity = 0.1 + Math.random() * 0.4

  return (
    <motion.div
      className="absolute rounded-full bg-indigo-400 pointer-events-none z-0"
      style={{ width: size, height: size, left: `${x}%`, bottom: '-10px', opacity }}
      animate={{ y: [0, -(Math.random() * 800 + 400)], opacity: [opacity, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/* ── Custom Cursor & Global Parallax Hook ──────────────────────── */
function useGlobalMouse() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
  
  // Smooth spring values for cursor dot
  const cursorX = useSpring(mouseX, { stiffness: 300, damping: 20 })
  const cursorY = useSpring(mouseY, { stiffness: 300, damping: 20 })
  
  // Smooth spring values for light/parallax effects
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 30 })
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 30 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return { cursorX, cursorY, smoothX, smoothY }
}

/* ── 3D card tilt hook ─────────────────────────────────────────── */
function use3DTilt() {
  const ref = useRef(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 150, damping: 20 })
  const springY = useSpring(rotateY, { stiffness: 150, damping: 20 })

  const onMouseMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -10) // Max tilt degrees
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 10)
  }
  const onMouseLeave = () => { rotateX.set(0); rotateY.set(0) }

  return { ref, springX, springY, onMouseMove, onMouseLeave }
}

/* ── Animated text shimmer ─────────────────────────────────────── */
function ShimmerText({ children, className }) {
  return (
    <span
      className={`inline-block text-transparent bg-clip-text ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg,#818cf8,#c084fc,#67e8f9,#818cf8)',
        backgroundSize: '300% auto',
        animation: 'shimmer 4s linear infinite',
      }}
    >
      {children}
    </span>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const globalMouse = useGlobalMouse()
  const cardTilt = use3DTilt()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [err, setErr]         = useState('')
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const [isClicking, setIsClicking] = useState(false)

  // Parallax transforms based on mouse position relative to screen center
  const parallaxX = useTransform(globalMouse.smoothX, [0, window.innerWidth], [-20, 20])
  const parallaxY = useTransform(globalMouse.smoothY, [0, window.innerHeight], [-20, 20])

  useEffect(() => {
    const handleMouseUp = () => setIsClicking(false)
    const handleMouseDown = () => setIsClicking(true)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const u = USERS.find(x => x.username === form.username && x.password === form.password)
      if (u) {
        localStorage.setItem('faq_user', JSON.stringify(u))
        localStorage.setItem('faq_company', 'All')
        navigate(u.role === 'admin' ? '/admin' : '/chat')
      } else {
        setErr('Invalid credentials. Please try again.')
      }
      setLoading(false)
    }, 900)
  }

  return (
    <div className="min-h-screen bg-[#060812] flex relative overflow-hidden" style={{ cursor: 'none' }}>

      {/* ── Keyframes ──────────── */}
      <style>{`
        @keyframes shimmer { 0%{background-position:0%} 100%{background-position:300%} }
        @keyframes grid-move { 0%{transform:translateY(0)} 100%{transform:translateY(50px)} }
        @keyframes float-slow { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-15px) rotate(2deg)} }
        @keyframes aurora {
          0%,100%{opacity:0.5;transform:scale(1);}
          50%{opacity:0.8;transform:scale(1.1);}
        }
        body { cursor: none !important; } /* force hide default cursor if styled above fails */
      `}</style>

      {/* ── Custom Cursor ──────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-50 flex items-center justify-center mix-blend-screen"
        style={{
          x: globalMouse.cursorX,
          y: globalMouse.cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{ scale: isClicking ? 0.6 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,1)]" />
        <motion.div
          className="absolute inset-0 rounded-full border border-indigo-400/50"
          animate={{ scale: isClicking ? 1.5 : 1, opacity: isClicking ? 0 : 1 }}
        />
      </motion.div>

      {/* ── Background Global Spotlight ────────────────── */}
      <motion.div
        className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-0 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          x: globalMouse.smoothX,
          y: globalMouse.smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      {/* ── Moving grid ────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.08) 1px,transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'grid-move 4s linear infinite',
          transform: 'perspective(1000px) rotateX(60deg) scale(2.5) translateY(-200px)',
          transformOrigin: 'top center',
        }}
      />

      {/* ── Aurora blobs ───────────────────────────────── */}
      <motion.div
        animate={{ scale:[1,1.3,1], rotate:[0,90,0] }}
        transition={{ duration:25, repeat:Infinity, ease:'linear' }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full pointer-events-none z-0"
        style={{ background:'radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)', animation:'aurora 10s ease-in-out infinite' }}
      />
      <motion.div
        animate={{ scale:[1,1.2,1], x:[0,50,0], y:[0,-40,0] }}
        transition={{ duration:20, repeat:Infinity, ease:'easeInOut' }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none z-0"
        style={{ background:'radial-gradient(circle,rgba(168,85,247,0.18) 0%,transparent 70%)' }}
      />

      {/* ── Particles ──────────────────────────────────── */}
      {Array.from({ length: 35 }).map((_, i) => <Particle key={i} index={i} />)}

      {/* ── Left Panel (Hero Text / Branding) ──────────── */}
      <motion.div
        style={{ x: parallaxX, y: parallaxY }} // Parallax movement
        className="hidden lg:flex flex-col justify-center w-[50%] p-16 xl:p-24 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
          className="flex flex-col gap-8"
        >
          {/* Logo brand */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group cursor-pointer" onMouseEnter={() => setIsClicking(true)} onMouseLeave={() => setIsClicking(false)}>
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-12 h-12 bg-[#060812] border border-white/10 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Brain size={24} className="text-white" />
              </div>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">FAQ<span className="text-indigo-400">AI</span></span>
          </div>

          <div>
            <h2 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight drop-shadow-2xl">
              Intelligent <br />
              <ShimmerText>Knowledge Base</ShimmerText><br />
              Made Simple.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              A high-performance Retrieval-Augmented Generation platform that turns your company documents into instant, accurate answers.
            </p>
          </div>

          {/* Feature chips */}
          <div className="mt-8 space-y-6 select-none relative z-20">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ x: 10, scale: 1.02 }}
                className="flex items-center gap-5 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon size={22} className="text-indigo-400 group-hover:text-indigo-200 transition-colors z-10" />
                </div>
                <div>
                  <p className="text-white text-base font-semibold tracking-wide drop-shadow-lg">{label}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Right Panel (3D Login Card) ────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          ref={cardTilt.ref}
          onMouseMove={cardTilt.onMouseMove}
          onMouseLeave={cardTilt.onMouseLeave}
          initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            rotateX: cardTilt.springX,
            rotateY: cardTilt.springY,
            transformPerspective: 1500,
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full max-w-md"
        >
          {/* Card Back Glow */}
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-[2.5rem] pointer-events-none"
            style={{
               background: 'linear-gradient(135deg,#6366f1,#a855f7,#06b6d4,#6366f1)',
               backgroundSize: '300% 300%',
               animation: 'shimmer 6s linear infinite',
               filter: 'blur(20px)',
               transform: 'translateZ(-50px)' // pushed back in 3D
            }}
          />

          {/* Glass Card Body */}
          <div
            className="relative rounded-[2rem] overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(20,22,45,0.7), rgba(10,12,30,0.8))',
              backdropFilter: 'blur(30px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Top edge highlight */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

            <div className="p-10" style={{ transform: 'translateZ(30px)' /* push content forward */ }}>
              
              <div className="mb-10 text-center flex flex-col items-center">
                {/* 3D Rotating Orbit Logo */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
                  className="flex flex-col items-center mb-6"
                >
                  <div className="relative mb-2">
                    {/* Orbit ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                      className="absolute -inset-3 rounded-full"
                      style={{ border: '1.5px dashed rgba(99,102,241,0.4)', transform: 'translateZ(10px)' }}
                    />
                    {/* Spinning gradient border */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute -inset-1.5 rounded-2xl"
                      style={{ background: 'linear-gradient(to bottom right,#6366f1,#a855f7,#06b6d4)', padding: 1, transform: 'translateZ(15px)' }}
                    >
                      <div className="w-full h-full rounded-2xl bg-[#0a0d1e]" />
                    </motion.div>
                    {/* Icon box */}
                    <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                      style={{ background: 'linear-gradient(135deg,#2e1065,#1e1b4b)', border: '1px solid rgba(139, 92, 246, 0.3)', transform: 'translateZ(20px)' }}>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Brain size={36} className="text-indigo-400 relative z-10" style={{ filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.9))' }} />
                      </motion.div>
                      <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                    </div>
                  </div>
                </motion.div>
                
                <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                  Welcome to FAQ Portal
                </h1>
                <p className="text-slate-400 text-sm mt-2">
                  Enter your credentials to continue
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6 relative z-10" onMouseEnter={() => setFocused('form')} onMouseLeave={() => setFocused(null)}>
                
                {/* Username */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-indigo-200/60 mb-2 ml-1">
                    Username
                  </label>
                  <div className="relative group perspective-1000">
                     <motion.input
                      whileTap={{ scale: 0.99, z: -10 }}
                      className="w-full bg-[#0d1024]/80 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 backdrop-blur-md outline-none transition-all focus:bg-[#151936] focus:border-indigo-500/50 shadow-inner"
                      placeholder="Enter your username"
                      value={form.username}
                      autoComplete="username"
                      onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setErr('') }}
                    />
                    {/* Input bottom glow */}
                    <div className="absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-focus-within:via-indigo-500/50 transition-all duration-500" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-indigo-200/60 mb-2 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <motion.input
                      whileTap={{ scale: 0.99, z: -10 }}
                      className="w-full bg-[#0d1024]/80 border border-white/5 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-slate-500 backdrop-blur-md outline-none transition-all focus:bg-[#151936] focus:border-indigo-500/50 shadow-inner"
                      type={show ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      autoComplete="current-password"
                      onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErr('') }}
                    />
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-slate-500 hover:text-indigo-400 transition-colors cursor-none"
                      onMouseEnter={() => setIsClicking(true)}
                      onMouseLeave={() => setIsClicking(false)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <div className="absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-focus-within:via-indigo-500/50 transition-all duration-500" />
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {err && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="px-4 py-3 rounded-xl text-sm text-red-300 font-medium backdrop-blur-md flex items-center gap-3 shadow-[0_10px_20px_rgba(239,68,68,0.15)] overflow-hidden relative"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-red-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {err}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit 3D Button */}
                <div 
                  className="pt-2 perspective-1000"
                  onMouseEnter={() => setIsClicking(true)}
                  onMouseLeave={() => setIsClicking(false)}
                >
                  <motion.button
                    type="submit"
                    disabled={loading || !form.username || !form.password}
                    whileHover={{ scale: 1.03, rotateX: 5, rotateY: -2 }}
                    whileTap={{ scale: 0.93, rotateX: 20, z: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-full relative py-4 text-sm font-bold rounded-xl text-white overflow-hidden group disabled:opacity-50 mt-1 cursor-none outline-none transform-style-3d shadow-[0_15px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.5)]"
                  >
                    {/* Advanced Gradient background */}
                    <div className="absolute inset-0 rounded-xl"
                      style={{ 
                        background: 'linear-gradient(110deg, #4f46e5, #9333ea, #06b6d4, #4f46e5)',
                        backgroundSize: '300% auto',
                        animation: 'shimmer 4s linear infinite',
                      }} 
                    />
                    
                    {/* Interactive flare that follows mouse (approximated center) */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay pointer-events-none"
                      style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
                    
                    {/* Text Layer */}
                    <span className="relative flex items-center justify-center gap-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                          style={{ transform: 'translateZ(20px)' }}>
                      {loading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          SIGN IN
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="text-indigo-200"
                          >
                            <ArrowRight size={18} strokeWidth={2.5} />
                          </motion.span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </form>

            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
