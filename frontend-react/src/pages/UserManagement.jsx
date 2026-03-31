import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Trash2, Shield, User, Mail, Key } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const EMPTY = { username:'', password:'', role:'user', email:'' }

export default function UserManagement() {
  const [users,   setUsers]   = useState([])
  const [form,    setForm]    = useState(EMPTY)
  const [adding,  setAdding]  = useState(false)
  const [showForm,setShowForm]= useState(false)

  const load = async () => {
    const r = await axios.get(`${API}/api/users`)
    setUsers(r.data)
  }
  useEffect(()=>{ load() },[])

  const addUser = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return
    try {
      await axios.post(`${API}/api/users`, form)
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const deleteUser = async (id) => {
    await axios.delete(`${API}/api/users/${id}`)
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} registered users</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} className="btn-primary">
          <UserPlus size={16}/> {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Add user form */}
      {showForm && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="card">
          <h3 className="font-semibold text-white mb-4">New User</h3>
          <form onSubmit={addUser} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1"><User size={11} className="inline mr-1"/>Username</label>
              <input className="input" value={form.username} placeholder="johndoe"
                onChange={e=>setForm(f=>({...f,username:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1"><Key size={11} className="inline mr-1"/>Password</label>
              <input className="input" type="password" value={form.password} placeholder="••••••••"
                onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1"><Mail size={11} className="inline mr-1"/>Email</label>
              <input className="input" type="email" value={form.email} placeholder="user@example.com"
                onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1"><Shield size={11} className="inline mr-1"/>Role</label>
              <select className="input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={adding} className="btn-primary">
                {adding ? 'Adding…' : <><UserPlus size={14}/> Create User</>}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-500 py-8">No users found</td></tr>
            )}
            {users.map(u => (
              <motion.tr key={u.id} layout initial={{opacity:0}} animate={{opacity:1}}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-200">{u.username}</span>
                  </div>
                </td>
                <td className="text-slate-400">{u.email || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-indigo' : 'badge-green'}`}>
                    {u.role === 'admin' ? <Shield size={11}/> : <User size={11}/>} {u.role}
                  </span>
                </td>
                <td className="text-slate-500 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button onClick={()=>deleteUser(u.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
