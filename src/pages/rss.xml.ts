import { rssXml } from '@tamable/blog-kit'
import type { APIRoute } from 'astro'
import site from '../../site.config'
import { content } from '../lib/content'
import { siteUrl } from '../lib/site'

export const GET: APIRoute = async () => {
  const xml = rssXml(await content.allPosts(), { siteUrl, title: site.name, description: site.description, language: site.locale })
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
