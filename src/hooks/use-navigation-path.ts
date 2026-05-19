import { useCallback, useEffect, useState } from 'react'
import {
  installInAppNavigation,
  navigateTo,
  pathnameFromNavigation,
} from '../navigation/navigation-api'

export function useNavigationPath() {
  const [pathname, setPathname] = useState(pathnameFromNavigation)

  useEffect(() => installInAppNavigation((pathname) => {
    setPathname(pathname ?? pathnameFromNavigation())
  }), [])

  const navigate = useCallback((path: string, search = '') => {
    void navigateTo(path, search)
  }, [])

  const replace = useCallback((path: string, search = '') => {
    void navigateTo(path, search, { replace: true })
  }, [])

  return { pathname, navigate, replace }
}
