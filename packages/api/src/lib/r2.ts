import type { ConfigJson, Env } from '../types'

export async function writeConfig(env: Env, siteId: string, config: ConfigJson): Promise<void> {
  await env.CONFIG_BUCKET.put(
    `config/${siteId}.json`,
    JSON.stringify(config),
    { httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=300' } }
  )
}

export async function readConfig(env: Env, siteId: string): Promise<ConfigJson | null> {
  const obj = await env.CONFIG_BUCKET.get(`config/${siteId}.json`)
  if (!obj) return null
  return obj.json<ConfigJson>()
}
