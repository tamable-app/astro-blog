import type { APIRoute } from 'astro'
import { siteUrl } from '../lib/site'

// Built from the site address, so the sitemap line is right on any domain.
export const GET: APIRoute = () => new Response(
  `User-agent: *\nDisallow: /preview/\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  { headers: { 'content-type': 'text/plain; charset=utf-8' } },
)
