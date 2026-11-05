import os from 'node:os'
import path from 'node:path'
import legacy from '@vitejs/plugin-legacy'
import viteReact from '@vitejs/plugin-react'
import browserslist from 'browserslist'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// The app has to run on an old Android phone (Chrome ~87). `browserslist` in package.json is
// the single source: it drives the JS syntax target and the core-js polyfills that
// plugin-legacy adds to the modern bundle (no separate legacy bundle).
const targets = browserslist()

export default defineConfig({
  base: '/',
  plugins: [
    viteReact({ compiler: true }),
    legacy({ modernTargets: targets, modernPolyfills: true, renderLegacyChunks: false }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    target: browserslistToEsbuild(targets),
  },
  server: {
    port: 5287,
    strictPort: true,
    // Local API: `bun run api-up` starts PHP + MariaDB in Docker on port 8088.
    proxy: { '/api': 'http://localhost:8088' },
    fs: {
      allow: [
        searchForWorkspaceRoot(import.meta.dirname),
        path.join(os.homedir(), '.bun/install/cache/links'),
      ],
    },
  },
})
