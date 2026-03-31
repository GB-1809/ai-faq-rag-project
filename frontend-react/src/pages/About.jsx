import { motion } from 'framer-motion'
import { GraduationCap, Code2, Users, Rocket, ExternalLink } from 'lucide-react'

// Demo data for team and mentor
const MENTOR = {
  name: "Dr. Nidhi Srivastav",
  role: "Project Mentor & Guide",
  bio: "Guided us throughout the project — providing direction, insights, and valuable support at every stage of development.",
  photo: "/mentor.png",
  bgColor: "from-blue-600 to-indigo-600"
}

const TEAM = [
  {
    name: "Garvit Bhardwaj",
    role: "Team Leader & Full Stack Developer",
    bio: "Orchestrated the project, built the core API, and ensured everything connects seamlessly.",
    photo: "/garvit.png",
    icon: Rocket,
    highlight: "from-purple-500 to-indigo-500",
    leader: true
  },
  {
    name: "Harsh Nagori",
    role: null,
    bio: null,
    photo: "https://api.dicebear.com/7.x/open-peeps/svg?seed=HarshN&backgroundColor=d1d4f9",
    icon: Code2,
    highlight: "from-emerald-500 to-teal-500",
    leader: false
  },
  {
    name: "Devanshi Jain",
    role: null,
    bio: null,
    photo: "https://api.dicebear.com/7.x/open-peeps/svg?seed=DevanshiJ&backgroundColor=ffd5dc",
    icon: Users,
    highlight: "from-pink-500 to-rose-500",
    leader: false
  },
  {
    name: "Bhawna Chauhan",
    role: null,
    bio: null,
    photo: "https://api.dicebear.com/7.x/open-peeps/svg?seed=BhawnaC&backgroundColor=ffdfbf",
    icon: Code2,
    highlight: "from-amber-500 to-orange-500",
    leader: false
  }
]

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="min-h-full bg-slate-950/50 p-6 md:p-10 lg:p-12 overflow-y-auto w-full relative">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium text-sm mb-6 shadow-glow">
            <Users size={16} />
            <span>Meet the Minds Behind the AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Our Team</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We are a group of passionate developers, designers, and AI enthusiasts who came together to solve the complex problem of intelligent knowledge management.
          </p>
        </motion.div>

        {/* Mentor Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-20 max-w-3xl mx-auto"
        >
          <div className="relative group rounded-3xl p-1 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 hover:from-blue-500/50 hover:to-indigo-500/50 transition-all duration-500 overflow-hidden shadow-2xl shadow-indigo-900/20">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-0 rounded-3xl" />
            <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              
              <div className="relative shrink-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${MENTOR.bgColor} blur-xl opacity-50 rounded-full group-hover:opacity-70 transition-opacity`} />
                <div className="w-32 h-32 md:w-40 md:h-40 relative bg-slate-800 rounded-full border-4 border-slate-700/50 p-2 overflow-hidden shadow-xl">
                  <img src={MENTOR.photo} alt={MENTOR.name} className="w-full h-full object-cover scale-110" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-800 p-2 rounded-full border border-slate-700 text-blue-400 shadow-lg">
                  <GraduationCap size={20} />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{MENTOR.name}</h2>
                <p className="text-blue-400 font-medium mb-4">{MENTOR.role}</p>
                <p className="text-slate-300 leading-relaxed max-w-lg">
                  "{MENTOR.bio}"
                </p>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Team Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {TEAM.map((member, idx) => {
            const Icon = member.icon;
            return (
              <motion.div key={idx} variants={itemVariants} className="group h-full">
                <div className="h-full card flex flex-col items-center text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden p-8">
                  
                  {/* Subtle top border gradient */}
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${member.highlight} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  
                  {/* Leader crown badge */}
                  {member.leader && (
                    <div className="absolute top-3 right-3 bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                      👑 Leader
                    </div>
                  )}
                  
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 bg-gradient-to-br ${member.highlight} blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full`} />
                    <div className="w-24 h-24 relative bg-slate-800 rounded-full border border-slate-700/50 p-1 overflow-hidden">
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover scale-110" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 bg-slate-800 p-1.5 rounded-full border border-slate-700 bg-gradient-to-br ${member.highlight} text-white shadow-lg`}>
                      <Icon size={14} />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">{member.name}</h3>
                  {member.role && <p className="text-sm font-medium text-slate-400 mb-4">{member.role}</p>}
                  {member.bio && (
                    <p className="text-sm text-slate-400 leading-relaxed flex-grow">
                      {member.bio}
                    </p>
                  )}

                </div>
              </motion.div>
            )
          })}
        </motion.div>

      </div>
    </div>
  )
}
