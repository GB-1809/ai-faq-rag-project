import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Loader2 } from 'lucide-react'

/**
 * AIExpansionCard
 *
 * Shown below FAQ/document answers.
 * - Dismiss → card gone, no API call
 * - Explain with AI → triggers LLM deep-explain, card hides immediately
 *
 * Props:
 *   question  {string}
 *   answer    {string}
 *   onExplain {() => void}
 *   onDismiss {() => void}
 *   loading   {boolean}
 */
export default function AIExpansionCard({ question, answer, onExplain, onDismiss, loading }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 260, damping: 20 }}
        className="mt-3 rounded-xl border border-indigo-500/20 bg-slate-800/60 backdrop-blur-sm p-3.5 shadow-lg shadow-indigo-500/5"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Sparkles size={12} className="text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-slate-300">
              Want a deeper explanation?
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onExplain}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-gradient-to-r from-indigo-500 to-purple-600 text-white
                       hover:shadow-md hover:shadow-indigo-500/30
                       disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {loading ? 'Generating…' : 'Explain with AI'}
          </motion.button>

          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium
                       border border-slate-600 text-slate-400
                       hover:border-slate-500 hover:text-slate-200 transition-all"
          >
            Dismiss
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
