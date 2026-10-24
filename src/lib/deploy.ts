import { handleDeploy, MAX_BODY_BYTES, reply, SIGNATURE_HEADER } from '@tamable/blog-kit/webhook'

export interface DeployConfig {
  secret: string
  deployHookUrl: string
  fetch?: typeof fetch
}

/** Answers Tamable's deploy webhook: checks the signature, then calls the host's build hook. */
export async function deploy(request: Request, config: DeployConfig): Promise<Response> {
  const rawBody = await readLimitedBody(request)
  const result = rawBody
    ? await handleDeploy({ rawBody, signature: request.headers.get(SIGNATURE_HEADER), ...config })
    : reply(413, 'Too large.')

  return Response.json(result.body, { status: result.status, headers: { 'cache-control': 'no-store' } })
}

/** Stops reading once the body passes the limit, so a huge request is never held in memory. */
export async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return null
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return body
}
