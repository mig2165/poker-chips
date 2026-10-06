import { ensureAnonymousSession, supabase } from './supabase'

export const REPORT_CATEGORIES = [
  'Something went wrong',
  'Login or account',
  'Online room or invitations',
  'Chat or messages',
  'Cards or poker rules',
  'Other',
] as const

export type ReportCategory = typeof REPORT_CATEGORIES[number]
export type ReportStatus = 'new' | 'reviewing' | 'resolved'

export interface AppReport {
  id: string
  category: ReportCategory
  description: string
  page_path: string
  screenshot_paths: string[]
  status: ReportStatus
  created_at: string
}

const MAX_SCREENSHOTS = 3
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024
const ALLOWED_SCREENSHOT_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'])

export function validateReportScreenshots(files: File[]): string | null {
  if (files.length > MAX_SCREENSHOTS) return `Attach up to ${MAX_SCREENSHOTS} screenshots.`
  if (files.some(file => !ALLOWED_SCREENSHOT_TYPES.has(file.type))) return 'Use a JPEG, PNG, GIF, WebP, or HEIC image.'
  if (files.some(file => file.size > MAX_SCREENSHOT_SIZE)) return 'Each screenshot must be 5 MB or smaller.'
  return null
}

export async function submitAppReport(
  category: ReportCategory,
  description: string,
  pagePath: string,
  screenshots: File[],
): Promise<void> {
  if (!supabase) throw new Error('Reporting is not configured on this site.')
  const screenshotError = validateReportScreenshots(screenshots)
  if (screenshotError) throw new Error(screenshotError)

  await ensureAnonymousSession()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Could not confirm your session. Reload the page and try again.')

  const uploadedPaths: string[] = []
  try {
    for (const screenshot of screenshots) {
      const safeName = screenshot.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'screenshot.png'
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage.from('app-report-screenshots').upload(path, screenshot, {
        contentType: screenshot.type,
        upsert: false,
      })
      if (error) throw new Error(`Could not upload screenshot: ${error.message}`, { cause: error })
      uploadedPaths.push(path)
    }

    const { error } = await supabase.from('app_reports').insert({
      category,
      description: description.trim(),
      page_path: pagePath,
      screenshot_paths: uploadedPaths,
    })
    if (error) throw new Error(`Could not save report: ${error.message}`, { cause: error })
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage.from('app-report-screenshots').remove(uploadedPaths)
      if (cleanupError) {
        throw new Error(`${error instanceof Error ? error.message : 'Could not submit report.'} Screenshot cleanup also failed: ${cleanupError.message}`, { cause: error })
      }
    }
    throw error
  }
}

export async function isCurrentUserReportAdmin(): Promise<boolean> {
  if (!supabase) return false
  const user = (await supabase.auth.getUser()).data.user
  if (!user || user.is_anonymous) return false
  const { data, error } = await supabase
    .from('app_report_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function listAppReports(): Promise<AppReport[]> {
  if (!supabase) throw new Error('Reporting is not configured on this site.')
  const { data, error } = await supabase
    .from('app_reports')
    .select('id, category, description, page_path, screenshot_paths, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as AppReport[]
}

export async function countNewAppReports(): Promise<number> {
  if (!supabase) throw new Error('Reporting is not configured on this site.')
  const { count, error } = await supabase
    .from('app_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
  if (error) throw error
  return count ?? 0
}

export async function createReportScreenshotUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Reporting is not configured on this site.')
  const { data, error } = await supabase.storage
    .from('app-report-screenshots')
    .createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function updateAppReportStatus(id: string, status: ReportStatus): Promise<void> {
  if (!supabase) throw new Error('Reporting is not configured on this site.')
  const { error } = await supabase.from('app_reports').update({ status }).eq('id', id)
  if (error) throw error
}
