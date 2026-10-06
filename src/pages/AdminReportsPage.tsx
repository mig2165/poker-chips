import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createReportScreenshotUrl, isCurrentUserReportAdmin, listAppReports, updateAppReportStatus, type AppReport, type ReportStatus } from '../lib/reporting'

const statusOptions: ReportStatus[] = ['new', 'reviewing', 'resolved']

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AppReport[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('Loading reports…')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    const hasAccess = await isCurrentUserReportAdmin()
    setIsAdmin(hasAccess)
    if (!hasAccess) {
      setMessage('This account is not authorized to view reports.')
      return
    }
    const items = await listAppReports()
    setReports(items)
    const urls = await Promise.all(items.map(async report => {
      const reportUrls = await Promise.all(report.screenshot_paths.map(path => createReportScreenshotUrl(path)))
      return [report.id, reportUrls] as const
    }))
    setImageUrls(Object.fromEntries(urls))
    setMessage(items.length === 0 ? 'No reports have been submitted yet.' : '')
  }, [])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh().catch(error => setMessage(error instanceof Error ? error.message : 'Could not load reports.'))
    }, 0)
    const timer = window.setInterval(() => {
      void refresh().catch(error => setMessage(error instanceof Error ? error.message : 'Could not refresh reports.'))
    }, 60000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(timer)
    }
  }, [refresh])

  async function changeStatus(report: AppReport, status: ReportStatus) {
    try {
      await updateAppReportStatus(report.id, status)
      setReports(current => current.map(item => item.id === report.id ? { ...item, status } : item))
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update report status.')
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link to="/" className="text-sm font-semibold text-slate-300 underline">← Lobby</Link>
      <div className="mt-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Player reports</h1>
        {isAdmin && <button onClick={() => void refresh().catch(error => setMessage(error instanceof Error ? error.message : 'Could not refresh reports.'))} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200">Refresh</button>}
      </div>
      <p className="mt-2 text-sm text-slate-400">Private inbox for player feedback and bug reports. It refreshes automatically.</p>
      {message && <p role="status" className={`mt-5 text-sm ${isAdmin === false ? 'text-amber-300' : 'text-slate-400'}`}>{message}</p>}
      {isAdmin && (
        <div className="mt-6 space-y-4">
          {reports.map(report => (
            <article key={report.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{report.category}</p>
                  <time className="mt-1 block text-xs text-slate-500" dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time>
                </div>
                <label className="text-xs text-slate-400">
                  Status
                  <select value={report.status} onChange={event => void changeStatus(report, event.target.value as ReportStatus)} className="ml-2 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200">
                    {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">{report.description}</p>
              <p className="mt-3 text-xs text-slate-500">Page: {report.page_path}</p>
              {(imageUrls[report.id] ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {imageUrls[report.id].map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Screenshot ${index + 1} for report`} className="max-h-48 max-w-full rounded-lg border border-slate-700 object-contain" /></a>)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
