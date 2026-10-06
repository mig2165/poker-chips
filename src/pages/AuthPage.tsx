import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resendSignupVerification, signIn, signUp } from '../lib/supabase'

export default function AuthPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [register, setRegister] = useState(false)
  const [message, setMessage] = useState('')
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setMessage('')
    setCanResendVerification(false)
    try {
      if (register) {
        const result = await signUp(email, password, username.trim())
        if (result.requiresEmailVerification) {
          setMessage('To finish setting up your account, verify your email using the link we just sent you. Check your inbox and spam folder.')
          setCanResendVerification(true)
        } else {
          setMessage('Your account is ready. You can sign in now.')
        }
      } else {
        await signIn(email, password)
        navigate('/profile')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      setMessage(errorMessage)
      if (errorMessage.toLowerCase().includes('verify')) {
        setCanResendVerification(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resendVerification() {
    if (isResendingVerification || !email.trim()) return
    setIsResendingVerification(true)
    try {
      await resendSignupVerification(email)
      setMessage('A new verification email has been sent. Check your inbox and spam folder.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not resend the verification email.')
    } finally {
      setIsResendingVerification(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-extrabold">{register ? 'Create account' : 'Sign in'}</h1>
      <p className="mt-2 text-sm text-slate-400">Accounts let you find friends and follow public tables.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {register && <input required minLength={3} value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-lg border bg-slate-900 px-4 py-3" />}
        <input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-lg border bg-slate-900 px-4 py-3" />
        <input required minLength={6} type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-lg border bg-slate-900 px-4 py-3" />
        <button disabled={isSubmitting} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:cursor-wait">
          {isSubmitting ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
      {canResendVerification && (
        <button
          onClick={() => void resendVerification()}
          disabled={isResendingVerification || !email.trim()}
          className="mt-3 text-sm font-semibold text-emerald-300 underline disabled:opacity-50"
        >
          {isResendingVerification ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
      <button onClick={() => setRegister(value => !value)} className="mt-6 text-sm text-slate-400 underline">
        {register ? 'Already have an account? Sign in' : 'Need an account? Create one'}
      </button>
    </main>
  )
}
