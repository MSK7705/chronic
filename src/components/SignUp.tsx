import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { User, Calendar, Phone, Mail, Lock, Eye, EyeOff, Flag, Activity } from 'lucide-react'

export default function SignUp() {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [nationality, setNationality] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const getPasswordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (!fullName || !age || !nationality || !dateOfBirth || !phoneNumber || !email || !password) {
      setError('Please fill in all fields')
      return
    }
    
    try {
      setLoading(true)
      
      // Sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            age: parseInt(age),
            nationality,
            date_of_birth: dateOfBirth,
            phone_number: phoneNumber,
          },
          emailRedirectTo: window.location.origin,
        },
      })

      if (signUpError) throw signUpError
      
      setSuccess('Registration successful! Please check your email to verify your account.')
      
      // Clear form
      setFullName('')
      setAge('')
      setNationality('')
      setDateOfBirth('')
      setPhoneNumber('')
      setEmail('')
      setPassword('')
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Global subtle background image */}
     

      <div className="grid md:grid-cols-3 min-h-screen">
        {/* Left hero with abstract vibrant image and overlay */}
        <div className="relative hidden md:block">
          
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-pink-500/10" />
          {/* Diagonal white wedge to echo the reference layout */}
          <div
            className="absolute right-0 top-0 h-full w-1/3 bg-white/90"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 35% 100%)' }}
          />
        </div>

        {/* Left hero with heart image and warm overlay */}
        <div className="relative hidden md:block">
          
          <div className="absolute inset-0 bg-gradient-to-br from-orange-200/70 via-rose-100/60 to-amber-200/70" />
          {/* Diagonal white wedge to echo the reference layout */}
          <div
            className="absolute right-0 top-0 h-full w-1/3 bg-white/90"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 35% 100%)' }}
          />
        </div>

        {/* Right signup form card */}
        <div className="flex items-start md:items-center justify-center px-6 py-12 md:py-0">
          <div className="relative w-full max-w-md rounded-2xl bg-white/85 backdrop-blur border border-indigo-200 shadow-xl p-8 transition-all duration-300 hover:shadow-2xl">
            {/* Decorative top corner lines */}
            <div className="absolute -top-4 left-6 h-2 w-24 rounded-full bg-indigo-200" />
            <div className="absolute -top-4 right-6 h-2 w-24 rounded-full bg-indigo-200" />

            <div className="text-center">
              <img src="/assets/logo.svg" alt="Health Guard" className="mx-auto h-12 w-12" />
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Create an Account</h2>
              <p className="mt-2 text-sm text-slate-600">Sign up for Health Guard</p>
            </div>

            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
              {/* Keep the existing grid and inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input id="full-name" name="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="John Doe" />
                  </div>
                </div>
                {/* Age */}
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Activity className="w-4 h-4" />
                    </span>
                    <input id="age" name="age" type="number" required min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="30" />
                  </div>
                </div>
                {/* Nationality */}
                <div>
                  <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Nationality</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Flag className="w-4 h-4" />
                    </span>
                    <input id="nationality" name="nationality" type="text" required value={nationality} onChange={(e) => setNationality(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="American" />
                  </div>
                </div>
                {/* DOB */}
                <div>
                  <label htmlFor="date-of-birth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input id="date-of-birth" name="dateOfBirth" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" />
                  </div>
                </div>
                {/* Phone */}
                <div>
                  <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input id="phone-number" name="phoneNumber" type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="+1 (555) 123-4567" />
                  </div>
                </div>
                {/* Email */}
                <div className="sm:col-span-2">
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email address</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input id="email-address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200" placeholder="john@example.com" />
                  </div>
                </div>
                {/* Password */}
                <div className="sm:col-span-2">
                  <label htmlFor="password" className="block text sm font-medium text-gray-700">Password</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setPasswordStrength(getPasswordStrength(e.target.value))
                      }}
                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 pr-10 text-slate-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {[0,1,2,3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 rounded ${i < passwordStrength ? (passwordStrength <= 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-orange-400' : passwordStrength === 3 ? 'bg-yellow-400' : 'bg-emerald-500') : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {password.length < 8 ? 'Too short' : passwordStrength <= 1 ? 'Weak' : passwordStrength === 2 ? 'Fair' : passwordStrength === 3 ? 'Good' : 'Strong'}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                    Creating account...
                  </span>
                ) : 'Continue'}
              </button>

              <div className="text-xs text-slate-500 text-center">
                By continuing, you agree to our <a href="#" className="text-indigo-600 underline">Terms</a> and <a href="#" className="text-indigo-600 underline">Privacy</a>.
              </div>

              <div className="text-center text-sm">
                <p>
                  Already have an account?{' '}
                  <a href="/login" className="font-medium text-indigo-700 hover:text-indigo-600">Sign in</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}