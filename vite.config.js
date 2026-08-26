import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const REACT_ENTRY = '/src/main.jsx'

const REGISTER_DOCUMENT = '/register/index.html'
const REGISTER_ALIASES = new Set(['/register', '/register/', '/register.html'])

/**
 * `/register` is a standalone document in `public/`, not a React route, so the
 * SPA fallback must not claim it. Static hosts resolve `public/register/index.html`
 * at `/register` on their own; this only teaches `vite dev` and `vite preview`
 * to do the same.
 */
function serveRegisterDocument() {
  const rewrite = (req, _res, next) => {
    const url = req.url || ''
    const queryAt = url.indexOf('?')
    const pathname = queryAt === -1 ? url : url.slice(0, queryAt)

    if (REGISTER_ALIASES.has(pathname)) {
      req.url = REGISTER_DOCUMENT + (queryAt === -1 ? '' : url.slice(queryAt))
    }

    next()
  }

  return {
    name: 'serve-register-document',
    // Middleware added here runs before Vite's internal SPA fallback.
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

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
  // The landing document is a single-page host: unmatched React routes leave the
  // embedded Framer page visible. `/register` is excluded from that fallback by
  // serveRegisterDocument().
  appType: 'spa',
  plugins: [react(), injectReactEntry(), serveRegisterDocument()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
