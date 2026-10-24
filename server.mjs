// Starts the built site. Runs before the adapter, which serves the prerendered files and the on-demand routes.
import { createServer } from 'node:http'
import process from 'node:process'

// The adapter's standalone build starts its own server on import unless told not to.
process.env.ASTRO_NODE_AUTOSTART = 'disabled'
const { handler } = await import('./dist/server/entry.mjs')

const port = Number(process.env.PORT ?? 4321)
const host = process.env.HOST ?? 'localhost'

createServer((req, res) => {
  const url = req.url ?? '/'

  // "//blog/" would otherwise get a redirect to "//blog", which browsers read as another host.
  const collapsed = url.replace(/^[/\\]{2,}/, '/')
  if (collapsed !== url) {
    res.writeHead(301, { location: collapsed })
    res.end()
    return
  }

  if (url === '/rss.xml' || url.startsWith('/rss.xml?')) {
    res.setHeader('content-type', 'application/rss+xml; charset=utf-8')
  }

  handler(req, res)
}).listen(port, host, () => {
  process.stdout.write(`Listening on http://${host}:${port}\n`)
})
