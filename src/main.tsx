import '@fontsource-variable/nunito'
import './index.css'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSync } from './features/sync/sync-engine'
import { preventPinchZoomInHomeScreenApp } from './lib/no-zoom'
import { router } from './router'

startSync()
preventPinchZoomInHomeScreenApp()

// Offline start on weak Wi-Fi. Only in the build: in dev it would cache Vite's modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
