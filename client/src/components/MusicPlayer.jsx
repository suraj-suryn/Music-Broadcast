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

// Player height presets (px) -- adapts to viewport width
function getHeights() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  if (w < 480) return { min: 52, normal: 155, max: 240 }
  if (w < 768) return { min: 52, normal: 185, max: 300 }
  return { min: 52, normal: 220, max: 420 }
}

// Human-readable quality labels
const QUALITY_LABELS = {
  highres: '4K', hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p', default: 'Auto'
}

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
  const HEIGHTS = getHeights()
  const ytPlayerRef = useRef(null)
  const audioRef = useRef(null)
  const containerRef = useRef(null)
  const [ytReady, setYtReady] = useState(!!window.YT?.Player)
  const [embedError, setEmbedError] = useState(null)
  const [playerSize, setPlayerSize] = useState('normal') // 'min' | 'normal' | 'max'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [quality, setQuality] = useState('default')
  const [availableQualities, setAvailableQualities] = useState([])
  // Refs keep values fresh inside YT event closures
  const qualityRef = useRef('default')
  const availableQualitiesRef = useRef([])
  // Silent audio keepalive — created once, never recreated
  const keepAliveRef = useRef(null)
  // Song duration (seconds) — set when player reports it
  const durationRef = useRef(0)

  // Latest values for async callbacks
  const playingRef = useRef(playing)
  const currentTimeRef = useRef(currentTime)
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])

  // Reset size + quality when song changes
  useEffect(() => {
    if (currentSong) setPlayerSize('normal')
    setEmbedError(null)
    setQuality('default')
    setAvailableQualities([])
    qualityRef.current = 'default'
    availableQualitiesRef.current = []
  }, [currentSong?.id])

  // Create single silent <audio> element for keepalive (never recreated)
  useEffect(() => {
    const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
    const sa = new Audio(SILENT)
    sa.loop = true
    sa.volume = 0.001
    keepAliveRef.current = sa
    return () => { sa.pause(); sa.src = ''; keepAliveRef.current = null }
  }, [])

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

  // ── Wake Lock: keep screen on while playing ──────────────
  useEffect(() => {
    let wakeLock = null
    async function acquire() {
      if (!('wakeLock' in navigator)) return
      try { wakeLock = await navigator.wakeLock.request('screen') } catch {}
    }
    function release() {
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null }
    }
    // Re-acquire when tab becomes visible again; also resume player that browser may have paused
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && playing && currentSong) {
        acquire()
        if (ytPlayerRef.current) { try { ytPlayerRef.current.playVideo() } catch {} }
        if (audioRef.current) { audioRef.current.play().catch(() => {}) }
        if (keepAliveRef.current) { keepAliveRef.current.play().catch(() => {}) }
      }
    }
    if (playing && currentSong) acquire()
    else release()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { release(); document.removeEventListener('visibilitychange', onVisibilityChange) }
  }, [playing, currentSong])

  // ── Media Session: show media controls on lock screen ────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: 'Music Room'
    })
    navigator.mediaSession.setActionHandler('play',      () => socket.emit('play'))
    navigator.mediaSession.setActionHandler('pause',     () => socket.emit('pause'))
    navigator.mediaSession.setActionHandler('nexttrack', () => socket.emit('song-ended'))
    return () => {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }, [currentSong?.id])

  // Sync Media Session playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  // ── Silent audio keepalive ───────────────────────────────
  // Starts/stops the persistent keepalive element so mobile browsers
  // register an active audio session → reduces background suspension.
  // Applies to both YouTube and uploaded audio sources.
  useEffect(() => {
    const ka = keepAliveRef.current
    if (!ka) return
    if (playing && currentSong) {
      ka.play().catch(() => {})
    } else {
      ka.pause()
    }
  }, [playing, currentSong?.id])

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
        playsinline: 1, // iOS Safari: prevent forced fullscreen on play
        origin: window.location.origin
      },
      events: {
        onReady(e) {
          e.target.seekTo(currentTimeRef.current, true)
          if (playingRef.current) e.target.playVideo()
        },
        onStateChange(e) {
          if (e.data === window.YT.PlayerState.ENDED) socket.emit('song-ended')
          // Capture duration once video is playing/buffering
          if (e.data === 1 || e.data === 3) {
            const dur = e.target.getDuration?.() ?? 0
            if (dur > 0) durationRef.current = dur
          }
          // Populate quality list once video starts buffering/playing
          if ((e.data === 1 || e.data === 3) && availableQualitiesRef.current.length === 0) {
            const levels = e.target.getAvailableQualityLevels?.() ?? []
            if (levels.length > 1) {
              availableQualitiesRef.current = levels
              setAvailableQualities(levels)
              // Apply pre-selected quality if changed before list loaded
              if (qualityRef.current !== 'default') {
                e.target.setPlaybackQuality(qualityRef.current)
              }
            }
          }
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

  // Reset duration when song changes
  useEffect(() => { durationRef.current = 0 }, [currentSong?.id])

  // applySync + getDuration exposed to Room.jsx
  useImperativeHandle(ref, () => ({
    getDuration() { return durationRef.current },
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

  // Quality change — local to each viewer, no socket needed
  function changeQuality(level) {
    setQuality(level)
    qualityRef.current = level
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setPlaybackQuality(level) } catch {}
    }
  }

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
           style={{ height: HEIGHTS.normal }}>
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
        {/* Iframe — always rendered so audio keeps playing when minimized.
             No visibility:hidden — that can cause YouTube to pause on some
             browsers. The mini-bar overlay covers it visually instead. */}
        <div id="yt-player-container" className="w-full h-full" />

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

        {/* Quality selector — bottom-left, appears once qualities load */}
        {availableQualities.length > 1 && playerSize !== 'min' && !embedError && (
          <div className="absolute bottom-8 left-2 z-20">
            <select
              value={quality}
              onChange={e => changeQuality(e.target.value)}
              title="Video quality (your view only)"
              className="bg-black/70 hover:bg-black/90 text-white text-xs rounded px-1.5 py-1 border border-gray-600 focus:outline-none cursor-pointer"
            >
              {availableQualities.map(q => (
                <option key={q} value={q}>{QUALITY_LABELS[q] ?? q}</option>
              ))}
            </select>
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
      <audio
        ref={audioRef}
        src={currentSong.url}
        onLoadedMetadata={() => { durationRef.current = audioRef.current?.duration || 0 }}
        onEnded={() => socket.emit('song-ended')}
        className="hidden"
      />

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
