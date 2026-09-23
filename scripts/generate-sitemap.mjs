import { mkdir, writeFile } from 'node:fs/promises'

const siteUrl = (globalThis.process?.env.SITE_URL || 'https://poker-chips-tracker-3lc5.onrender.com')
  .trim()
  .replace(/\/+$/, '')

if (!/^https?:\/\/[^/]+/.test(siteUrl)) {
  throw new Error('SITE_URL must be an absolute http(s) URL')
}

await mkdir('public', { recursive: true })
await writeFile(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
)
