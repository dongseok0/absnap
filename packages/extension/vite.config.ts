import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export function toHostPermission(baseUrl: string): string {
  return `${new URL(baseUrl).origin}/*`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE ?? 'http://localhost:8787'
  const cdnBase = env.VITE_CDN_BASE ?? 'http://localhost:4321'

  const hostPermissions = Array.from(new Set([
    toHostPermission(apiBase),
    toHostPermission(cdnBase)
  ]))

  return {
    plugins: [
      react(),
      crx({ manifest: { ...manifest, host_permissions: hostPermissions } })
    ],
    define: {
      __API_BASE__: JSON.stringify(apiBase),
      __CDN_BASE__: JSON.stringify(cdnBase)
    },
    build: {
      rollupOptions: {
        // popup.html is the React app entry.
        // content/index.ts is emitted with a STABLE filename (no hash) so the
        // service worker can reference it as 'assets/content.js' without reading
        // the manifest. It is NOT listed in manifest content_scripts (that would
        // require broad host_permissions); instead it is injected only when the
        // user clicks "에디터 열기" on the currently active tab.
        input: {
          popup: 'popup.html',
          content: 'src/content/index.ts',
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'content' ? 'assets/content.js' : 'assets/[name]-[hash].js',
        }
      }
    }
  }
})
