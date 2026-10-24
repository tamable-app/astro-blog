import type { APIRoute } from 'astro'
import { DEPLOY_HOOK_URL, TAMABLE_WEBHOOK_SECRET } from 'astro:env/server'
import { deploy } from '../../lib/deploy'

export const prerender = false

// Tamable's deploy webhook: set Settings › Sites › Deploy webhook to https://<your site>/api/deploy.
export const POST: APIRoute = ({ request }) =>
  deploy(request, { secret: TAMABLE_WEBHOOK_SECRET ?? '', deployHookUrl: DEPLOY_HOOK_URL ?? '' })
