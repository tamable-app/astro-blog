import { createContentSource, createTamableClient, type PostSummary, type Tag } from '@tamable/blog-kit'
import { TAMABLE_API_URL, TAMABLE_READ_KEY } from 'astro:env/server'

export const tamable = createTamableClient({ apiUrl: TAMABLE_API_URL, readKey: TAMABLE_READ_KEY ?? '' })

// A build reads each thing once; the dev server always reads fresh.
export const content = createContentSource(tamable, { cache: !import.meta.env.DEV })

export interface TagCount extends Tag {
  count: number
}

export function tagCounts(posts: PostSummary[]): TagCount[] {
  const counts = new Map<string, TagCount>()
  for (const post of posts) {
    for (const tag of post.tags) {
      const entry = counts.get(tag.slug) ?? { ...tag, count: 0 }
      entry.count++
      counts.set(tag.slug, entry)
    }
  }
  return [...counts.values()].sort((a, b) => a.slug.localeCompare(b.slug))
}
