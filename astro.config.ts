import { existsSync } from 'node:fs'
import node from '@astrojs/node'
import { defineConfig, envField } from 'astro/config'
import tamable from './integrations/tamable'
import site from './site.config'

// The integration below reads Tamable while the config loads, before Astro has read .env itself.
if (existsSync('.env')) process.loadEnvFile('.env')

const siteUrl = (process.env.SITE_URL || site.url).replace(/\/+$/, '')

export default defineConfig({
  site: siteUrl,
  trailingSlash: 'never',
  // Pages are prerendered; the preview page and the deploy webhook run on the Node server.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  session: false,
  integrations: [tamable({ siteUrl, ghost: site.ghostRedirects })],

  // Server only and read when used, so none of these is baked into the build or sent to browsers.
  env: {
    schema: {
      TAMABLE_API_URL: envField.string({ context: 'server', access: 'secret', default: 'https://api.tamable.app/api/v1' }),
      TAMABLE_READ_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TAMABLE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      DEPLOY_HOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
})
