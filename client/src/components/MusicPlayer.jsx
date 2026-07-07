import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react'
import { socket } from '../socket.js'

const MusicPlayer = forwardRef(function MusicPlayer({ currentSong, playing, currentTime }, ref) {
  const ytPlayerRef = useRef(null)
  const audioRef = useRef(null)
  const [ytReady, setYtReady] = useState(!!window.YT?.Player)

  // Latest values available to async callbacks (avoids stale closures)
  const playingRef = useRef(playing)
  const currentTimeRef = useRef(currentTime)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT?.Player) { setYtReady(true); return }

    window.onYouTubeIframeAPIReady = () => setYtReady(true)

    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script')
      s.id = 'yt-api-script'
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  }, [])

  // Create / destroy YouTube player when song changes
  useEffect(() => {
    if (!currentSong || currentSong.source !== 'youtube') {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy() } catch {}
        ytPlayerRef.current = null
      }
      return
    }
    if (!ytReady) return

    // Destroy previous instance
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy() } catch {}
      ytPlayerRef.current = null
    }

    ytPlayerRef.current = new window.YT.Player('yt-player-container', {
      height: '100%',
      width: '100%',
      videoId: currentSong.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        origin: window.location.origin
      },
      events: {
        onReady(e) {
          const t = currentTimeRef.current
          e.target.seekTo(t, true)
          if (playingRef.current) e.target.playVideo()
        },
        onStateChange(e) {
          if (e.data === window.YT.PlayerState.ENDED) {
            socket.emit('song-ended')
          }
        }
      }
    })

    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy() } catch {}
        ytPlayerRef.current = null
      }
    }
  }, [currentSong?.id, ytReady])

  // Expose applySync to Room.jsx via ref
  useImperativeHandle(ref, () => ({
    applySync({ playing, currentTime, timestamp, song }) {
      // Compensate for network latency when song is playing
      const adjusted =
        playing && timestamp
          ? currentTime + (Date.now() - timestamp) / 1000
          : currentTime

      const src = song?.source ?? currentSong?.source

      if (src === 'youtube' && ytPlayerRef.current) {
        const p = ytPlayerRef.current
        try {
          const playerTime = typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0
          if (Math.abs(playerTime - adjusted) > 1.5) p.seekTo(adjusted, true)
          if (playing) p.playVideo()
          else p.pauseVideo()
        } catch {}
      } else if (src === 'upload' && audioRef.current) {
        const el = audioRef.current
        if (Math.abs(el.currentTime - adjusted) > 1.5) el.currentTime = adjusted
        if (playing) el.play().catch(() => {})
        else el.pause()
      }
    }
  }), [currentSong])

  // ── Render ───────────────────────────────────────────────
  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-900 text-gray-500 shrink-0"
           style={{ height: 200 }}>
        <div className="text-5xl mb-3">🎵</div>
        <p className="text-sm">No song playing</p>
      </div>
    )
  }

  if (currentSong.source === 'youtube') {
    return (
      <div className="relative bg-black shrink-0" style={{ height: 220 }}>
        <div id="yt-player-container" className="w-full h-full" />
        {/* Song title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
          <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
        </div>
      </div>
    )
  }

  // Uploaded audio
  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 shrink-0 gap-3 px-4"
         style={{ height: 200 }}>
      <div className="text-5xl">🎵</div>
      <p className="text-white font-semibold text-center truncate max-w-xs">{currentSong.title}</p>
      <audio
        ref={audioRef}
        src={currentSong.url}
        onEnded={() => socket.emit('song-ended')}
        className="hidden"
      />
    </div>
  )
})

export default MusicPlayer
