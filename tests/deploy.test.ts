import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { deploy } from '../src/lib/deploy'

const secret = 'test-secret'
const deployHookUrl = 'https://hooks.example/build'

function sign(body: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

function call(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/deploy', { method: 'POST', body, headers, duplex: 'half' } as RequestInit)
}

const changed = () => JSON.stringify({ event: 'content.changed', sent_at: new Date().toISOString() })

describe('deploy', () => {
  it('refuses an unsigned call without calling the hook', async () => {
    const hook = vi.fn<typeof fetch>()
    const response = await deploy(call(changed()), { secret, deployHookUrl, fetch: hook })
    expect(response.status).toBe(401)
    expect(hook).not.toHaveBeenCalled()
  })

  it('calls the build hook for a signed content change', async () => {
    const hook = vi.fn<typeof fetch>(async () => new Response('ok'))
    const body = changed()
    const response = await deploy(call(body, { 'x-tamable-signature': sign(body) }), { secret, deployHookUrl, fetch: hook })
    expect(response.status).toBe(202)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ ok: true, message: 'Deploy started.' })
    expect(hook).toHaveBeenCalledOnce()
    expect(String(hook.mock.calls[0]![0])).toBe(deployHookUrl)
    expect(hook.mock.calls[0]![1]).toMatchObject({ method: 'POST' })
  })

  it('answers 503 when the webhook is not configured', async () => {
    const body = changed()
    const response = await deploy(call(body, { 'x-tamable-signature': sign(body) }), { secret: '', deployHookUrl })
    expect(response.status).toBe(503)
  })

  it('refuses a large body by its length', async () => {
    const response = await deploy(call('x', { 'content-length': '20000' }), { secret, deployHookUrl })
    expect(response.status).toBe(413)
  })

  it('stops reading a large body sent without a length', async () => {
    const chunk = new Uint8Array(4_000)
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk)
      },
    })
    const response = await deploy(call(stream), { secret, deployHookUrl })
    expect(response.status).toBe(413)
  })
})
