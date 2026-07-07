import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react'
import { socket } from '../socket.js'

// YouTube player error codes
const YT_ERROR_MSG = {
  2:   'Invalid video ID.',
  5:   'HTML5 player error.',
  100: 'Video not found or is private.',
  101: 'This video cannot be embedded (owner restriction).',
  150: 'This video cannot be embedded (owner restriction).'
}

// Player height presets (px)
const HEIGHTS = { min: 52, normal: 220, max: 420 }

// Small icon button used in the player overlay
function CtrlBtn({ onClick, title, children, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors
        ${active
          ? 'bg-indigo-600 text-white'
          : 'bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

const MusicPlayer = forwardRef(function MusicPlayer({ currentSong, playing, currentTime }, ref) {
  const ytPlayerRef = useRef(null)
  const audioRef = useRef(null)
  const containerRef = useRef(null)
  const [ytReady, setYtReady] = useState(!!window.YT?.Player)
  const [embedError, setEmbedError] = useState(null)
  const [playerSize, setPlayerSize] = useState('normal') // 'min' | 'normal' | 'max'
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Latest values for async callbacks
  const playingRef = useRef(playing)
  const currentTimeRef = useRef(currentTime)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])

  // Reset size when song changes
  useEffect(() => {
    if (currentSong) setPlayerSize('normal')
    setEmbedError(null)
  }, [currentSong?.id])

  // Fullscreen API
  useEffect(() => {
    function onFSChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

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

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy() } catch {}
      ytPlayerRef.current = null
    }

    ytPlayerRef.current = new window.YT.Player('yt-player-container', {
      height: '100%',
      width: '100%',
      videoId: currentSong.videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        fs: 1,
        origin: window.location.origin
      },
      events: {
        onReady(e) {
          e.target.seekTo(currentTimeRef.current, true)
          if (playingRef.current) e.target.playVideo()
        },
        onStateChange(e) {
          if (e.data === window.YT.PlayerState.ENDED) socket.emit('song-ended')
        },
        onError(e) {
          const msg = YT_ERROR_MSG[e.data] || `Player error (code ${e.data})`
          setEmbedError(msg)
          setTimeout(() => socket.emit('song-ended'), 3000)
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

  // applySync exposed to Room.jsx
  useImperativeHandle(ref, () => ({
    applySync({ playing, currentTime, timestamp, song }) {
      const adjusted = playing && timestamp
        ? currentTime + (Date.now() - timestamp) / 1000
        : currentTime
      const src = song?.source ?? currentSong?.source

      if (src === 'youtube' && ytPlayerRef.current) {
        const p = ytPlayerRef.current
        try {
          const t = typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0
          if (Math.abs(t - adjusted) > 1.5) p.seekTo(adjusted, true)
          if (playing) p.playVideo(); else p.pauseVideo()
        } catch {}
      } else if (src === 'upload' && audioRef.current) {
        const el = audioRef.current
        if (Math.abs(el.currentTime - adjusted) > 1.5) el.currentTime = adjusted
        if (playing) el.play().catch(() => {}); else el.pause()
      }
    }
  }), [currentSong])

  // ── Shared size controls overlay ─────────────────────────
  function SizeControls() {
    return (
      <div className="absolute top-1.5 right-1.5 flex gap-1 z-30">
        {playerSize !== 'min'  && <CtrlBtn onClick={() => setPlayerSize('min')}    title="Minimize">—</CtrlBtn>}
        {playerSize !== 'normal' && <CtrlBtn onClick={() => setPlayerSize('normal')} title="Restore">◻</CtrlBtn>}
        {playerSize !== 'max'  && <CtrlBtn onClick={() => setPlayerSize('max')}    title="Maximize">▲</CtrlBtn>}
        <CtrlBtn onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} active={isFullscreen}>
          {isFullscreen ? '⊠' : '⛶'}
        </CtrlBtn>
      </div>
    )
  }

  // ── No song ───────────────────────────────────────────────
  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-900 text-gray-500 shrink-0"
           style={{ height: 200 }}>
        <div className="text-5xl mb-3">🎵</div>
        <p className="text-sm">No song playing</p>
      </div>
    )
  }

  // ── YouTube ───────────────────────────────────────────────
  if (currentSong.source === 'youtube') {
    const height = isFullscreen ? '100vh' : HEIGHTS[playerSize]
    return (
      <div
        ref={containerRef}
        className="relative bg-black shrink-0 overflow-hidden transition-[height] duration-200"
        style={{ height }}
      >
        {/* Iframe — always rendered so audio keeps playing when minimized */}
        <div
          id="yt-player-container"
          className="w-full h-full"
          style={{ visibility: playerSize === 'min' ? 'hidden' : 'visible' }}
        />

        {/* Mini bar shown when minimized */}
        {playerSize === 'min' && (
          <div className="absolute inset-0 flex items-center justify-between px-3 bg-gray-900 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🎵</span>
              <span className="text-white text-sm truncate">{currentSong.title}</span>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <CtrlBtn onClick={() => setPlayerSize('normal')} title="Restore">◻</CtrlBtn>
              <CtrlBtn onClick={() => setPlayerSize('max')} title="Maximize">▲</CtrlBtn>
              <CtrlBtn onClick={toggleFullscreen} title="Fullscreen" active={isFullscreen}>⛶</CtrlBtn>
            </div>
          </div>
        )}

        {/* Size controls (non-minimized) */}
        {playerSize !== 'min' && <SizeControls />}

        {/* Embed error overlay */}
        {embedError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 px-6 text-center z-10 gap-2">
            <div className="text-3xl">⚠️</div>
            <p className="text-red-400 text-sm font-medium">{embedError}</p>
            <p className="text-gray-500 text-xs">Skipping in 3 s…</p>
            <a href={currentSong.url} target="_blank" rel="noopener noreferrer"
               className="text-indigo-400 text-xs underline mt-1">
              Open on YouTube ↗
            </a>
          </div>
        )}

        {/* Song title overlay */}
        {!embedError && playerSize !== 'min' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
            <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Uploaded audio ────────────────────────────────────────
  const audioHeight = isFullscreen ? '100vh' : HEIGHTS[playerSize]
  return (
    <div
      ref={containerRef}
      className="relative bg-gray-900 shrink-0 overflow-hidden transition-[height] duration-200"
      style={{ height: audioHeight }}
    >
      {/* Audio element always present */}
      <audio ref={audioRef} src={currentSong.url} onEnded={() => socket.emit('song-ended')} className="hidden" />

      {/* Mini bar */}
      {playerSize === 'min' ? (
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🎵</span>
            <span className="text-white text-sm truncate">{currentSong.title}</span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <CtrlBtn onClick={() => setPlayerSize('normal')} title="Restore">◻</CtrlBtn>
            <CtrlBtn onClick={() => setPlayerSize('max')} title="Maximize">▲</CtrlBtn>
            <CtrlBtn onClick={toggleFullscreen} title="Fullscreen" active={isFullscreen}>⛶</CtrlBtn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
          <div className="text-5xl">🎵</div>
          <p className="text-white font-semibold text-center truncate max-w-xs">{currentSong.title}</p>
        </div>
      )}

      {/* Size controls (non-minimized) */}
      {playerSize !== 'min' && <SizeControls />}
    </div>
  )
})

export default MusicPlayer
