import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { z } from 'zod'
import { useFamilyKey, useSyncStatus } from './features/family/family-store'
import { slotSchema } from './features/family/schema'
import { BrushPage } from './pages/BrushPage'
import { HomePage } from './pages/HomePage'
import { OverviewPage } from './pages/OverviewPage'
import { ParentsPage } from './pages/ParentsPage'
import { PhotoPage } from './pages/PhotoPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { StartScreen } from './pages/StartScreen'

/** Without a (valid) family link every page shows the start screen, except the privacy page. */
function RootGate() {
  const familyKey = useFamilyKey()
  const status = useSyncStatus()
  const isPrivacy = useRouterState({ select: (s) => s.location.pathname === '/datenschutz' })
  if ((!familyKey || status === 'unauthorized') && !isPrivacy) return <StartScreen />
  return <Outlet />
}

const rootRoute = createRootRoute({ component: RootGate })

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

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datenschutz',
  component: PrivacyPage,
})

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/uebersicht',
  validateSearch: z.object({ kid: z.string().optional().catch(undefined) }),
  component: OverviewPage,
})

const photoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/foto',
  validateSearch: z.object({
    /** Monday of the week, `YYYY-MM-DD`; missing means this week. */
    week: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
    kid: z.string().optional().catch(undefined),
  }),
  component: PhotoPage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    brushRoute,
    parentsRoute,
    overviewRoute,
    photoRoute,
    privacyRoute,
  ]),
  defaultNotFoundComponent: () => <Navigate to="/" />,
  defaultErrorComponent: ErrorScreen,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function ErrorScreen() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-moss-800 p-6 text-center text-cream">
      <p className="text-2xl font-extrabold">Hier ist etwas schiefgegangen.</p>
      <a href="/" className="rounded-full bg-sun px-6 py-3 text-xl font-extrabold text-bark-900">
        Zurück in den Wald
      </a>
    </main>
  )
}
