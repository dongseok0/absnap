import { describe, it, expect } from 'vitest'
import { matchesPattern } from '../src/urlmatch'

describe('matchesPattern', () => {
  it('matches exact paths', () => {
    expect(matchesPattern('/pricing', '/pricing')).toBe(true)
    expect(matchesPattern('/pricing', '/about')).toBe(false)
  })

  it('* matches single segment (not across /)', () => {
    expect(matchesPattern('/blog/*', '/blog/hello-world')).toBe(true)
    expect(matchesPattern('/blog/*', '/blog/')).toBe(true)
    expect(matchesPattern('/blog/*', '/blog/a/b')).toBe(false)
  })

  it('** matches any depth', () => {
    expect(matchesPattern('/docs/**', '/docs/a/b/c')).toBe(true)
    expect(matchesPattern('/docs/**', '/docs/a')).toBe(true)
    expect(matchesPattern('/docs/**', '/other')).toBe(false)
  })

  it('/* matches any single top-level path', () => {
    expect(matchesPattern('/*', '/anything')).toBe(true)
    expect(matchesPattern('/*', '/a/b')).toBe(false)
  })

  it('query strings are ignored', () => {
    expect(matchesPattern('/pricing', '/pricing?plan=pro')).toBe(true)
  })

  it('matches against full URL pathname', () => {
    expect(matchesPattern('/pricing*', 'https://example.com/pricing-page')).toBe(true)
  })
})
