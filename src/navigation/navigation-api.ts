/**
 * Client-side routing via the Navigation API (not window.history).
 * Intercepts same-origin document navigations so <a href> works as SPA transitions.
 */

export function pathnameFromNavigation() {
  const href = window.navigation?.currentEntry?.url ?? window.location.href
  return new URL(href).pathname
}

export function searchFromNavigation() {
  const href = window.navigation?.currentEntry?.url ?? window.location.href
  return new URL(href).search
}

export function currentDocumentUrl() {
  return `${window.location.pathname}${window.location.search}`
}

export function navigateTo(
  path: string,
  search = '',
  options: { replace?: boolean } = {},
) {
  const url = `${path}${search}`
  if (!window.navigation) {
    throw new Error('Navigation API is not available in this browser')
  }
  return window.navigation.navigate(url, {
    history: options.replace ? 'replace' : 'push',
  })
}

export function installInAppNavigation(onPathChange: (pathname?: string) => void) {
  const navigation = window.navigation
  if (!navigation) return () => {}

  function onCurrentEntryChange() {
    onPathChange()
  }

  function onNavigate(event: NavigateEvent) {
    if (!event.canIntercept) return
    if (event.hashChange || event.downloadRequest) return

    const dest = new URL(event.destination.url)
    if (dest.origin !== window.location.origin) return

    const nextPath = dest.pathname

    event.intercept({
      handler() {
        onPathChange(nextPath)
      },
    })
  }

  navigation.addEventListener('currententrychange', onCurrentEntryChange)
  navigation.addEventListener('navigate', onNavigate)

  return () => {
    navigation.removeEventListener('currententrychange', onCurrentEntryChange)
    navigation.removeEventListener('navigate', onNavigate)
  }
}
