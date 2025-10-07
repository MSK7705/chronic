import { useState } from 'react'
import { supabase } from '../lib/supabase'
import backgroundImg from '../../assets/background.jpg'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      // Redirect will happen automatically if auth state changes
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      setError('Check your email for the confirmation link')
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <img src={backgroundImg} alt="Decorative background" className="pointer-events-none select-none absolute inset-0 -z-10 w-full h-full object-cover" />

      <div className="grid md:grid-cols-3 min-h-screen">
        {/* Left visuals placeholder for symmetry */}
        <div className="hidden md:block" />
        <div className="hidden md:block" />

        {/* Right login form card */}
        <div className="flex items-start md:items-center justify-center px-6 py-12 md:py-0">
          <div className="relative w-full max-w-md rounded-2xl bg-white/85 backdrop-blur border border-indigo-200 shadow-xl p-8 space-y-8 transition-all duration-300 hover:shadow-2xl md:-translate-x-20">
            {/* Decorative top corner lines */}
           
           
            <div className="text-center">
              <img src="/assets/logo.svg" alt="Health Guard" className="mx-auto h-12 w-12" />
              <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Chronic Health</h2>
              <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email address</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input id="email-address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="Email address" />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 pr-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="Password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Forgot your password?</a>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70">
                  {loading ? 'Loading...' : 'Sign in'}
                </button>
                <a href="/signup" className="group relative flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  Create an account
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}