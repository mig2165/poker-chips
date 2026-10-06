import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { REPORT_CATEGORIES, submitAppReport, validateReportScreenshots, type ReportCategory } from '../lib/reporting'

export default function ReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = typeof location.state === 'object' && location.state !== null && 'from' in location.state && typeof location.state.from === 'string'
    ? location.state.from
    : '/'
  const [category, setCategory] = useState<ReportCategory>(REPORT_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function selectScreenshots(files: FileList | null) {
    const selected = Array.from(files ?? [])
    const validationError = validateReportScreenshots(selected)
    setMessage(validationError ?? '')
    setScreenshots(validationError ? [] : selected)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setMessage('')
    try {
      await submitAppReport(category, description, returnPath, screenshots)
      setSubmitted(true)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit your report.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <section className="rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-6">
          <h1 className="text-2xl font-extrabold text-emerald-200">Report received</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Thanks for letting us know. Your report is stored privately for the site owner to review.</p>
          <button onClick={() => navigate('/')} className="mt-5 rounded-lg border border-emerald-300/60 px-4 py-2 text-sm font-bold text-emerald-200">Back to lobby</button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <button onClick={() => navigate(-1)} className="text-sm font-semibold text-slate-300 underline">← Go back</button>
      <h1 className="mt-5 text-3xl font-extrabold">Report a problem</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Choose the closest option, tell us what happened, and attach screenshots if they help. Reports and screenshots are only visible to the site owner.</p>

      <form onSubmit={event => void submit(event)} className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <label className="block text-sm font-semibold text-slate-200">
          What is this about?
          <select value={category} onChange={event => setCategory(event.target.value as ReportCategory)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3">
            {REPORT_CATEGORIES.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          What happened?
          <textarea required minLength={8} maxLength={3000} value={description} onChange={event => setDescription(event.target.value)} rows={6} placeholder="What did you expect, and what happened instead?" className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-normal" />
          <span className="mt-1 block text-right text-xs font-normal text-slate-500">{description.length}/3000</span>
        </label>
        <label className="block text-sm font-semibold text-slate-200">
          Screenshots (optional)
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic" multiple onChange={event => selectScreenshots(event.target.files)} className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:font-semibold file:text-white" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Up to 3 images, 5 MB each.</span>
        </label>
        {screenshots.length > 0 && <p className="text-xs text-slate-400">{screenshots.map(file => file.name).join(', ')}</p>}
        {message && <p role="alert" className="text-sm text-amber-300">{message}</p>}
        <button disabled={isSubmitting || description.trim().length < 8} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:cursor-wait disabled:bg-slate-700 disabled:text-white">
          {isSubmitting ? 'Sending report…' : 'Submit report'}
        </button>
      </form>
    </main>
  )
}
