/// <reference types="vite/client" />

/** Navigation API — Chromium / modern browsers (OBS browser source) */
interface NavigateEvent extends Event {
  readonly navigationType: NavigationTypeString
  readonly destination: NavigationDestination
  readonly canIntercept: boolean
  readonly hashChange: boolean
  readonly downloadRequest: string | null
  intercept(options?: { handler?: () => void | Promise<void> }): void
}

interface NavigationDestination {
  readonly url: string
}

interface NavigationHistoryEntry {
  readonly url: string | null
}

interface Navigation {
  readonly currentEntry: NavigationHistoryEntry | null
  addEventListener(
    type: 'navigate' | 'currententrychange',
    listener: (event: NavigateEvent) => void,
  ): void
  removeEventListener(
    type: 'navigate' | 'currententrychange',
    listener: (event: NavigateEvent) => void,
  ): void
  navigate(
    url: string,
    options?: { history?: 'auto' | 'push' | 'replace' },
  ): Promise<NavigationHistoryEntry>
}

interface Window {
  navigation: Navigation
}
