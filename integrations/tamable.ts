import { createTamableClient } from '@tamable/blog-kit'
import type { AstroIntegration } from 'astro'
import { loadRedirects } from '../src/lib/redirects'

const MODULE_ID = 'virtual:tamable/redirects'

export interface TamableIntegrationOptions {
  siteUrl: string
  ghost: boolean
}

// When the site builds, turns Tamable's renamed posts (and Ghost's old addresses, if on) into 301s,
// so the live server redirects without asking Tamable. Also refuses to build an empty blog.
export default function tamable({ siteUrl, ghost }: TamableIntegrationOptions): AstroIntegration {
  return {
    name: 'tamable',
    hooks: {
      'astro:config:setup': async ({ command, updateConfig, injectRoute, logger }) => {
        let map: Record<string, string> = {}

        if (command === 'build') {
          const client = createTamableClient({
            apiUrl: process.env.TAMABLE_API_URL || 'https://api.tamable.app/api/v1',
            readKey: process.env.TAMABLE_READ_KEY ?? '',
          })
          const result = await loadRedirects(client, { siteUrl, ghost, allowEmpty: process.env.ALLOW_EMPTY_BLOG === 'true' })
          map = result.map
          logger.info(`${Object.keys(map).length} redirects from ${result.posts} posts and ${result.renamed} renames`)
        }

        if (command === 'dev') {
          injectRoute({ pattern: '/dev/blocks', entrypoint: './src/dev/blocks.astro' })
          // The dev server answers "/blog/" with a warning page; let src/fetch.ts redirect it, as in production.
          updateConfig({ trailingSlash: 'ignore' })
        }

        updateConfig({
          redirects: Object.fromEntries(Object.entries(map).map(([from, to]) => [from, { status: 301, destination: to }])),
          vite: {
            plugins: [{
              name: 'tamable-redirects',
              resolveId: id => (id === MODULE_ID ? `\0${MODULE_ID}` : undefined),
              load: id => (id === `\0${MODULE_ID}` ? `export default ${JSON.stringify(map)}` : undefined),
            }],
          },
        })
      },
    },
  }
}
