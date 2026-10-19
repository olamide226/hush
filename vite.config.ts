import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function normalizeSiteUrl(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, '') ?? ''
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function resolveSiteUrl(mode: string): string {
  const env = loadEnv(mode, process.cwd(), '')

  const explicit = normalizeSiteUrl(env.SITE_URL)
  if (explicit) return explicit

  const vercelProduction = normalizeSiteUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  )
  if (vercelProduction) return vercelProduction

  return 'http://localhost:5173'
}

function seoPlugin(siteUrl: string): Plugin {
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /e/',
    'Disallow: /admin/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteUrl}/</loc>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n')

  return {
    name: 'hush-seo',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl)
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0]

        if (pathname === '/robots.txt') {
          response.setHeader('Content-Type', 'text/plain; charset=utf-8')
          response.end(robots)
          return
        }

        if (pathname === '/sitemap.xml') {
          response.setHeader(
            'Content-Type',
            'application/xml; charset=utf-8',
          )
          response.end(sitemap)
          return
        }

        next()
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robots,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemap,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const siteUrl = resolveSiteUrl(mode)

  return {
    plugins: [react(), seoPlugin(siteUrl)],
  }
})
