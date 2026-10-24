import { buildRedirects, redirectPaths, toPostSummary, withoutTrailingSlash, type TamableClient } from '@tamable/blog-kit'

export interface RedirectOptions {
  siteUrl: string
  ghost: boolean
  allowEmpty: boolean
}

export class EmptyBlogError extends Error {
  constructor() {
    super('Tamable has no published posts for this site, so the build stopped rather than publish an empty blog. Set ALLOW_EMPTY_BLOG=true to build one on purpose.')
    this.name = 'EmptyBlogError'
  }
}

/** Every 301 the site answers, read from Tamable when the site builds. Refuses an empty blog unless allowed. */
export async function loadRedirects(client: TamableClient, { siteUrl, ghost, allowEmpty }: RedirectOptions) {
  const [posts, renamed] = await Promise.all([client.allPosts(), client.redirects()])
  if (!posts.length && !allowEmpty) throw new EmptyBlogError()

  const map = buildRedirects({ posts: posts.map(toPostSummary), renamed: redirectPaths(renamed, siteUrl), ghost })
  return { map, posts: posts.length, renamed: renamed.length }
}

/**
 * The 301 that runs before Astro's own routing, or null. Removes trailing slashes (one hop straight
 * to a renamed post's new address) and, when moving from Ghost, sends old tag and author pages home.
 * Preview tokens may end in a slash, so previews are left alone.
 */
export function earlyRedirect(pathname: string, redirects: Record<string, string>, ghost: boolean): string | null {
  if (pathname.startsWith('/preview/')) return null
  const trimmed = withoutTrailingSlash(pathname)
  if (trimmed) return redirects[trimmed] ?? trimmed
  if (ghost && !redirects[pathname]) {
    if (pathname.startsWith('/tag/')) return '/blog'
    if (pathname.startsWith('/author/')) return '/about'
  }
  return null
}
