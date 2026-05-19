import { useEffect, useRef } from 'react'

const TRACK_SRC = '/mission-control-pulse.mp3'

function musicDisabled(search: string) {
  const q = new URLSearchParams(search)
  const v = q.get('music')
  return v === '0' || v === 'false' || v === 'off'
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (musicDisabled(window.location.search)) return

    const audio = audioRef.current
    if (!audio) return

    const tryPlay = () => {
      void audio.play().catch(() => {})
    }

    tryPlay()
    audio.addEventListener('canplaythrough', tryPlay)
    return () => audio.removeEventListener('canplaythrough', tryPlay)
  }, [])

  if (musicDisabled(window.location.search)) return null

  return (
    <audio
      ref={audioRef}
      src={TRACK_SRC}
      autoPlay
      loop
      preload="auto"
      aria-hidden
    />
  )
}
