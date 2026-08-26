import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const REACT_ENTRY = '/src/main.jsx'

const STANDALONE_ROUTES = [
  {
    document: '/register/index.html',
    aliases: new Set(['/register', '/register/', '/register.html']),
  },
  {
    document: '/admin/index.html',
    aliases: new Set(['/admin', '/admin/', '/admin.html']),
  },
  {
    document: '/prompts/index.html',
    aliases: new Set(['/prompts', '/prompts/', '/prompts.html']),
  },
]

/**
 * Standalone documents in `public/` are not React routes, so the SPA fallback
 * must not claim them. Static hosts resolve these on their own; this teaches
 * `vite dev` and `vite preview` to do the same.
 */
function serveStandaloneDocuments() {
  const rewrite = (req, _res, next) => {
    const url = req.url || ''
    const queryAt = url.indexOf('?')
    const pathname = queryAt === -1 ? url : url.slice(0, queryAt)

    for (const route of STANDALONE_ROUTES) {
      if (route.aliases.has(pathname)) {
        req.url = route.document + (queryAt === -1 ? '' : url.slice(queryAt))
        break
      }
    }

    if (req.url === url && /\/prompts\/[a-z0-9-]+-prompt\/?$/.test(pathname)) {
      const normalized = pathname.replace(/\/$/, '')
      req.url = `${normalized}/index.html${queryAt === -1 ? '' : url.slice(queryAt)}`
    }

    next()
  }

  return {
    name: 'serve-standalone-documents',
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

        const withCta = html.replace(
          '</body>',
          '<script src="/framer-cta.js"></script>\n</body>',
        )

        return withCta.replace(
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
  plugins: [react(), injectReactEntry(), serveStandaloneDocuments()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
