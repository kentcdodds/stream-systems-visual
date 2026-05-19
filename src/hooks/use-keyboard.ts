import { useEffect } from 'react'

export type KeyboardHandlers = {
  onPauseToggle: () => void
  onReseed: () => void
  onOverlayToggle: () => void
  onDebugToggle: () => void
}

export function useKeyboard(handlers: KeyboardHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()
      if (key === ' ') {
        e.preventDefault()
        handlers.onPauseToggle()
      } else if (key === 'r') {
        handlers.onReseed()
      } else if (key === 'o') {
        handlers.onOverlayToggle()
      } else if (key === 'd') {
        handlers.onDebugToggle()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
