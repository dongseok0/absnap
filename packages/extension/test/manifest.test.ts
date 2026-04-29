import { describe, expect, it } from 'vitest'
import manifest from '../manifest.json'

describe('extension manifest', () => {
  it('declares store-safe icons and permissions', () => {
    expect(manifest.icons).toEqual({
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    })
    expect(manifest.host_permissions).toEqual([])
    expect(manifest.permissions).toEqual(['storage', 'tabs', 'activeTab', 'scripting'])
    expect(manifest).not.toHaveProperty('content_scripts')
  })
})
