import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router'
import { z } from 'zod'
import { slotSchema } from './features/family/schema'
import { BrushPage } from './pages/BrushPage'
import { HomePage } from './pages/HomePage'
import { ParentsPage } from './pages/ParentsPage'

const rootRoute = createRootRoute({ component: Outlet })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: z.object({ week: z.number().int().max(0).min(-52).optional().catch(undefined) }),
  component: HomePage,
})

const brushRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/putzen',
  validateSearch: z.object({ kid: z.string(), slot: slotSchema }),
  component: BrushPage,
})

const parentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/eltern',
  component: ParentsPage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, brushRoute, parentsRoute]),
  defaultNotFoundComponent: () => <Navigate to="/" />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
