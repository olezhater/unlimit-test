import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The document title is spec copy, so it is injected from
 * states.list.copy.pageTitle at build time rather than written into index.html.
 * Transcribing it there would be a second source of truth, and the tab would
 * show the stale string until React mounted.
 */
function pageTitleFromSpec(): Plugin {
  return {
    name: 'page-title-from-spec',
    transformIndexHtml(html) {
      const spec = JSON.parse(
        readFileSync(new URL('./spec/transaction-history.spec.json', import.meta.url), 'utf8'),
      )
      const title = spec.states.find((s: { id: string }) => s.id === 'list')?.copy?.pageTitle ?? ''
      return html.replace('%PAGE_TITLE%', title)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pageTitleFromSpec()],
})
