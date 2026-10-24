import { sitemapEntries, sitemapXml } from '@tamable/blog-kit'
import type { APIRoute } from 'astro'
import { content } from '../lib/content'
import { siteUrl } from '../lib/site'

// The site's own pages; posts, tags and series come from Tamable.
const PAGES = ['/', '/blog', '/series', '/about']

export const GET: APIRoute = async () => {
  const entries = sitemapEntries(PAGES, await content.allPosts(), await content.seriesSummaries())
  return new Response(sitemapXml(entries, siteUrl), { headers: { 'content-type': 'application/xml; charset=utf-8' } })
}
