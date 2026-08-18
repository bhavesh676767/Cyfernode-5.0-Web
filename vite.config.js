import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const REACT_ENTRY = '/src/main.jsx'

/**
 * Injects the React bootstrap script at transform time only.
 * The source index.html on disk is never written to.
 */
function injectReactEntry() {
  return {
    name: 'inject-react-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (html.includes(REACT_ENTRY) || html.includes('/src/main.jsx')) {
          return html
        }

        return html.replace(
          '</body>',
          `<script type="module" src="${REACT_ENTRY}"></script>\n</body>`,
        )
      },
    },
  }
}

export default defineConfig({
  appType: 'spa',
  plugins: [react(), injectReactEntry()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
  },
})
