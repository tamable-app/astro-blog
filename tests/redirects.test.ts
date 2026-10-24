import type { Server } from 'node:http'
import { createTamableClient, type TamableClient } from '@tamable/blog-kit'
import { FAKE_READ_KEY, startFakeTamable } from '@tamable/blog-kit/fake'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { earlyRedirect, EmptyBlogError, loadRedirects } from '../src/lib/redirects'

const PORT = 4031
let server: Server
let client: TamableClient

beforeAll(async () => {
  server = await startFakeTamable({ port: PORT })
  client = createTamableClient({ apiUrl: `http://localhost:${PORT}/api/v1`, readKey: FAKE_READ_KEY })
})

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))

const options = { siteUrl: 'https://example.com', ghost: false, allowEmpty: false }

describe('loadRedirects', () => {
  it('turns posts renamed in Tamable into paths on this site', async () => {
    const { map } = await loadRedirects(client, options)
    expect(map).toEqual({ '/blog/old-name': '/blog/hello-world' })
  })

  it('ignores renames on another host', async () => {
    const { map } = await loadRedirects(client, { ...options, siteUrl: 'https://elsewhere.example' })
    expect(map).toEqual({})
  })

  it('adds Ghost addresses when asked', async () => {
    const { map } = await loadRedirects(client, { ...options, ghost: true })
    expect(map).toMatchObject({
      '/hello-world': '/blog/hello-world',
      '/tag/work': '/tags/work',
      '/rss': '/rss.xml',
      '/blog/old-name': '/blog/hello-world',
    })
  })

  it('refuses an empty blog unless allowed', async () => {
    const empty = { ...client, allPosts: async () => [], redirects: async () => [] }
    await expect(loadRedirects(empty, options)).rejects.toBeInstanceOf(EmptyBlogError)
    await expect(loadRedirects(empty, { ...options, allowEmpty: true })).resolves.toMatchObject({ map: {}, posts: 0 })
  })
})

describe('earlyRedirect', () => {
  const map = { '/blog/old-name': '/blog/hello-world' }

  it('removes a trailing slash', () => {
    expect(earlyRedirect('/blog/', map, false)).toBe('/blog')
    expect(earlyRedirect('/blog/hello-world//', map, false)).toBe('/blog/hello-world')
    expect(earlyRedirect('/blog', map, false)).toBeNull()
    expect(earlyRedirect('/', map, false)).toBeNull()
  })

  it('goes straight to a renamed post in one hop', () => {
    expect(earlyRedirect('/blog/old-name/', map, false)).toBe('/blog/hello-world')
  })

  it('never redirects off the site', () => {
    expect(earlyRedirect('//evil.example/', map, false)).toBe('/evil.example')
    expect(earlyRedirect('/\\evil.example/', map, false)).toBe('/evil.example')
  })

  it('leaves previews alone, since a token can end in a slash', () => {
    expect(earlyRedirect('/preview/abc/', map, false)).toBeNull()
  })

  it('sends Ghost tag and author pages home only when moving from Ghost', () => {
    expect(earlyRedirect('/tag/unknown', map, true)).toBe('/blog')
    expect(earlyRedirect('/author/someone', map, true)).toBe('/about')
    expect(earlyRedirect('/tag/unknown', map, false)).toBeNull()
  })
})
