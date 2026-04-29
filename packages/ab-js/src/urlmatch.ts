function getPathname(urlOrPath: string): string {
  try {
    return new URL(urlOrPath).pathname
  } catch {
    return urlOrPath.split('?')[0]
  }
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§DOUBLESTAR§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DOUBLESTAR§/g, '.*')
  return new RegExp(`^${escaped}$`)
}

export function matchesPattern(pattern: string, url: string): boolean {
  const pathname = getPathname(url)
  const patternPath = getPathname(pattern)
  return globToRegex(patternPath).test(pathname)
}
