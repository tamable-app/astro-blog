import { astro, FetchState } from 'astro/fetch'
import redirects from 'virtual:tamable/redirects'
import site from '../site.config'
import { earlyRedirect } from './lib/redirects'

// Requests the Node server renders: everything but the prerendered pages, which it serves as files.
export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    const target = earlyRedirect(url.pathname, redirects, site.ghostRedirects)
    if (target) {
      const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308
      return Promise.resolve(new Response(null, { status, headers: { location: target + url.search } }))
    }

    // A preview token can end in "/". Encoded, it survives Astro's own trailing-slash redirect.
    if (url.pathname.startsWith('/preview/') && url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname.slice(0, -1)}%2F`
      request = new Request(url, request)
    }

    return astro(new FetchState(request))
  },
}
