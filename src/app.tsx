import { Suspense, useEffect } from 'react'
import { useNavigationPath } from './hooks/use-navigation-path'
import { HomePage } from './pages/home-page'
import { NotFoundPage } from './pages/not-found-page'
import { matchRoute } from './routes'
import { getRouteConfig, homePath } from './routes/route-config'

const systemsRoute = getRouteConfig('systems')

function hasSimulationQuery(search: string) {
  const q = new URLSearchParams(search)
  return q.has('seed') || q.has('density') || q.has('speed')
}

export default function App() {
  const { pathname, replace } = useNavigationPath()
  const match = matchRoute(pathname)

  // Legacy: /?seed=… → /v/systems?seed=…
  useEffect(() => {
    if (pathname !== homePath) return
    if (!hasSimulationQuery(window.location.search)) return
    replace(systemsRoute.path, window.location.search)
  }, [pathname, replace])

  if (match === null) return <NotFoundPage />

  if (match.route === null) return <HomePage />

  const Page = match.route.Page
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
