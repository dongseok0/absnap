// Polyfill localStorage for happy-dom environment
// happy-dom v15 doesn't expose a proper Storage API by default
class LocalStorageMock {
  private store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }
}

const localStorageMock = new LocalStorageMock()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
})
