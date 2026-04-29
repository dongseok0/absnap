import { describe, expect, it } from 'vitest'
import { API_BASE, CDN_BASE } from '../src/env'

describe('runtime endpoint defaults', () => {
  it('defaults to production endpoints when build constants are not injected', () => {
    expect(API_BASE).toBe('https://api.absnap.com')
    expect(CDN_BASE).toBe('https://cdn.absnap.com')
  })
})
