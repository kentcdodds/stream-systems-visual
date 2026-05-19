import { Suspense, useEffect, type ReactNode } from 'react'
import { BackgroundMusic } from './components/background-music'
import { useNavigationPath } from './hooks/use-navigation-path'
import { readCycleInterval, readCycleOptions } from './hooks/use-navigation-search'
import { CyclePage } from './pages/cycle-page'
import { HomePage } from './pages/home-page'
import { NotFoundPage } from './pages/not-found-page'
import { matchRoute } from './routes'
import { cyclePath, getRouteConfig, homePath } from './routes/route-config'

const systemsRoute = getRouteConfig('systems')

function hasSimulationQuery(search: string) {
  const q = new URLSearchParams(search)
  return q.has('seed') || q.has('density') || q.has('speed')
}

function cycleRedirectSearch(search: string) {
  const q = new URLSearchParams(search)
  q.delete('cycle')
  const next = q.toString()
  return next ? `?${next}` : `?interval=${readCycleInterval(search)}`
}

export default function App() {
  const { pathname, replace } = useNavigationPath()
  const match = matchRoute(pathname)

  // Legacy: /?cycle=1&interval=… → /cycle?interval=…
  useEffect(() => {
    if (pathname !== homePath) return
    if (!readCycleOptions(window.location.search, pathname).active) return
    void replace(cyclePath, cycleRedirectSearch(window.location.search))
  }, [pathname, replace])

  // Legacy: /?seed=… → /v/systems?seed=…
  useEffect(() => {
    if (pathname !== homePath) return
    if (readCycleOptions(window.location.search, pathname).active) return
    if (!hasSimulationQuery(window.location.search)) return
    replace(systemsRoute.path, window.location.search)
  }, [pathname, replace])

  let page: ReactNode
  if (pathname === cyclePath) {
    page = <CyclePage />
  } else if (match === null) {
    page = <NotFoundPage />
  } else if (match.route === null) {
    page = <HomePage />
  } else {
    const Page = match.route.Page
    page = (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    )
  }

  return (
    <>
      <BackgroundMusic />
      {page}
    </>
  )
}
