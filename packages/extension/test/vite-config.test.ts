import { describe, expect, it } from 'vitest'
import { toHostPermission } from '../vite.config'

describe('extension vite config', () => {
  it('turns deployment base URLs into Chrome host permissions', () => {
    expect(toHostPermission('https://api.example.workers.dev')).toBe('https://api.example.workers.dev/*')
    expect(toHostPermission('https://cdn.example.test/config')).toBe('https://cdn.example.test/*')
  })
})
