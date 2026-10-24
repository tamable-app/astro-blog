// Starts the built site. Runs before the adapter, which serves the prerendered files and the on-demand routes.
import { createServer } from 'node:http'
import process from 'node:process'

// The adapter's standalone build starts its own server on import unless told not to.
process.env.ASTRO_NODE_AUTOSTART = 'disabled'
const { handler } = await import('./dist/server/entry.mjs')

const port = Number(process.env.PORT ?? 4321)
const host = process.env.HOST ?? 'localhost'

/** A Location starting with two slashes or a backslash is read by browsers as another host. */
function onSite(location) {
  return typeof location === 'string' ? location.replace(/^[/\\]{2,}/, '/') : location
}

createServer((req, res) => {
  const url = req.url ?? '/'

  // "//blog/" would otherwise get a redirect to "//blog", which browsers read as another host.
  const collapsed = url.replace(/^[/\\]{2,}/, '/')
  if (collapsed !== url) {
    res.writeHead(301, { location: collapsed })
    res.end()
    return
  }

  // Whatever the adapter answers, a redirect never leaves the site.
  const setHeader = res.setHeader.bind(res)
  res.setHeader = (name, value) => setHeader(name, name.toLowerCase() === 'location' ? onSite(value) : value)
  const writeHead = res.writeHead.bind(res)
  res.writeHead = (status, ...rest) => {
    const headers = rest.find(arg => arg && typeof arg === 'object')
    for (const name of Object.keys(headers ?? {})) {
      if (name.toLowerCase() === 'location') headers[name] = onSite(headers[name])
    }
    return writeHead(status, ...rest)
  }

  if (url === '/rss.xml' || url.startsWith('/rss.xml?')) {
    res.setHeader('content-type', 'application/rss+xml; charset=utf-8')
  }

  handler(req, res)
}).listen(port, host, () => {
  process.stdout.write(`Listening on http://${host}:${port}\n`)
})
