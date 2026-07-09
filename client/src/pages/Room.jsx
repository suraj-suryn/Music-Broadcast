import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket.js'
import { useRoom } from '../context/RoomContext.jsx'
import MusicPlayer from '../components/MusicPlayer.jsx'
import Controls from '../components/Controls.jsx'
import Queue from '../components/Queue.jsx'
import AddSong from '../components/AddSong.jsx'
import Suggestions from '../components/Suggestions.jsx'
import Chat from '../components/Chat.jsx'
import UserList from '../components/UserList.jsx'
import VoteSkip from '../components/VoteSkip.jsx'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useRoom()
  const { room, user, currentSong, playing, currentTime, queue, chat, votes, repeat, queueMode, history, suggestions } = state
  const playerRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const prevChatLen = useRef(0)

  // ── Reconnect ──────────────────────────────────────────
  const [reconnecting, setReconnecting] = useState(false)
  const reconnectingRef = useRef(false)
  const userNameRef = useRef(user?.name ?? null)
  useEffect(() => { if (user?.name) userNameRef.current = user.name }, [user?.name])

  // ── Duration (polled from player ref) ─────────────────
  const [songDuration, setSongDuration] = useState(0)
  useEffect(() => { setSongDuration(0) }, [currentSong?.id])
  useEffect(() => {
    if (!currentSong || !playing) return
    const t = setInterval(() => {
      const d = playerRef.current?.getDuration?.() ?? 0
      if (d > 0) setSongDuration(d)
    }, 500)
    return () => clearInterval(t)
  }, [currentSong?.id, playing])

  // ── Now-playing toast ──────────────────────────────────
  const [nowPlaying, setNowPlaying] = useState(null)
  const prevSongIdRef = useRef(null)
  useEffect(() => {
    if (!currentSong || currentSong.id === prevSongIdRef.current) return
    prevSongIdRef.current = currentSong.id
    setNowPlaying(currentSong.title)
    const t = setTimeout(() => setNowPlaying(null), 3500)
    return () => clearTimeout(t)
  }, [currentSong?.id])

  useEffect(() => {
    // Redirect if no room state (e.g. page refresh)
    if (!room || !user) {
      navigate('/', { replace: true })
      return
    }

    function onPlaybackSync(data) {
      dispatch({ type: 'PLAYBACK_SYNC', payload: data })
      playerRef.current?.applySync(data)
    }
    function onQueueUpdated({ queue }) {
      dispatch({ type: 'QUEUE_UPDATED', queue })
    }
    function onHistoryUpdated({ history }) {
      dispatch({ type: 'HISTORY_UPDATED', history })
    }
    function onSuggestionsUpdated({ suggestions }) {
      dispatch({ type: 'SUGGESTIONS_UPDATED', suggestions })
    }
    function onNewMessage(message) {
      dispatch({ type: 'NEW_MESSAGE', message })
    }
    function onUserJoined({ users, hostRestored }) {
      dispatch({ type: 'USERS_UPDATED', users })
      if (hostRestored) {
        const hostName = users.find(u => u.isHost)?.name
        dispatch({ type: 'SET_INFO', message: `👑 ${hostName} (original host) has rejoined and taken control` })
        setTimeout(() => dispatch({ type: 'CLEAR_INFO' }), 4000)
      }
    }
    function onUserLeft({ users }) {
      dispatch({ type: 'USERS_UPDATED', users })
    }
    function onVoteUpdated(payload) {
      dispatch({ type: 'VOTE_UPDATED', payload })
    }
    function onRepeatChanged({ repeat }) {
      dispatch({ type: 'SET_REPEAT', repeat })
    }
    function onHostTransferred({ users, newHostName }) {
      dispatch({ type: 'USERS_UPDATED', users })
      dispatch({ type: 'SET_INFO', message: `👑 ${newHostName} is now the host` })
      setTimeout(() => dispatch({ type: 'CLEAR_INFO' }), 4000)
    }
    function onQueueModeChanged({ queueMode }) {
      dispatch({ type: 'SET_QUEUE_MODE', queueMode })
    }
    function onError({ message }) {
      if (reconnectingRef.current) {
        // Reconnect failed (room gone) → go home
        reconnectingRef.current = false
        setReconnecting(false)
        navigate('/', { replace: true })
        return
      }
      dispatch({ type: 'SET_ERROR', message })
    }
    function onDisconnect() {
      reconnectingRef.current = true
      setReconnecting(true)
    }
    function onConnect() {
      if (!reconnectingRef.current) return
      const name = userNameRef.current
      if (!code || !name) { navigate('/', { replace: true }); return }
      socket.emit('join-room', { roomCode: code, name })
    }
    function onRoomJoined({ room: roomData, user: userData, currentTime }) {
      if (!reconnectingRef.current) return
      reconnectingRef.current = false
      setReconnecting(false)
      dispatch({ type: 'SET_ROOM', room: roomData, user: userData, currentTime })
      playerRef.current?.applySync({ playing: roomData.playing, currentTime, timestamp: Date.now(), song: roomData.currentSong })
    }
    function onKicked() {
      navigate('/', { replace: true, state: { kicked: true } })
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') socket.emit('request-sync')
    }

    socket.on('playback-sync', onPlaybackSync)
    socket.on('queue-updated', onQueueUpdated)
    socket.on('history-updated', onHistoryUpdated)
    socket.on('suggestions-updated', onSuggestionsUpdated)
    socket.on('new-message', onNewMessage)
    socket.on('user-joined', onUserJoined)
    socket.on('user-left', onUserLeft)
    socket.on('vote-updated', onVoteUpdated)
    socket.on('repeat-changed', onRepeatChanged)
    socket.on('host-transferred', onHostTransferred)
    socket.on('queue-mode-changed', onQueueModeChanged)
    socket.on('error', onError)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)
    socket.on('room-joined', onRoomJoined)
    socket.on('kicked', onKicked)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      socket.off('playback-sync', onPlaybackSync)
      socket.off('queue-updated', onQueueUpdated)
      socket.off('history-updated', onHistoryUpdated)
      socket.off('suggestions-updated', onSuggestionsUpdated)
      socket.off('new-message', onNewMessage)
      socket.off('user-joined', onUserJoined)
      socket.off('user-left', onUserLeft)
      socket.off('vote-updated', onVoteUpdated)
      socket.off('repeat-changed', onRepeatChanged)
      socket.off('host-transferred', onHostTransferred)
      socket.off('queue-mode-changed', onQueueModeChanged)
      socket.off('error', onError)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
      socket.off('room-joined', onRoomJoined)
      socket.off('kicked', onKicked)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [room, user, navigate, dispatch])

  // Update page title with room code
  useEffect(() => {
    if (code) document.title = `🎵 Room ${code}`
    return () => { document.title = 'Music Room' }
  }, [code])

  // ── Keyboard shortcuts (host only) ────────────────────
  useEffect(() => {
    if (!user?.isHost || !currentSong) return
    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        socket.emit(playing ? 'pause' : 'play')
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        socket.emit('next-song')
      } else if (e.key === 'r' || e.key === 'R') {
        // Cycle repeat: off → all → one → off
        if (repeat) {
          socket.emit('set-repeat', { repeat: false })
          socket.emit('set-queue-mode', { mode: 'consume' })
        } else if (queueMode === 'cycle') {
          socket.emit('set-queue-mode', { mode: 'consume' })
          socket.emit('set-repeat', { repeat: true })
        } else {
          socket.emit('set-queue-mode', { mode: 'cycle' })
          socket.emit('set-repeat', { repeat: false })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [user?.isHost, currentSong, playing, repeat, queueMode])

  // Track unread messages when sidebar is closed
  useEffect(() => {
    if (chat.length > prevChatLen.current && !sidebarOpen) {
      setUnread(n => n + (chat.length - prevChatLen.current))
    }
    prevChatLen.current = chat.length
  }, [chat.length, sidebarOpen])

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function getInviteUrl() {
    return `${window.location.origin}/?join=${code}`
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(getInviteUrl()).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  function downloadPlaylist() {
    const lines = []
    const date = new Date().toLocaleString()
    lines.push(`🎵 Music Room – Room ${code}`)
    lines.push(`Exported: ${date}`)
    lines.push('='.repeat(44))
    if (history.length) {
      lines.push('\nPlayed:')
      history.forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s.title}`)
        if (s.url) lines.push(`     ${s.url}`)
      })
    }
    if (currentSong) {
      lines.push('\nNow Playing:')
      lines.push(`  ${currentSong.title}`)
      if (currentSong.url) lines.push(`  ${currentSong.url}`)
    }
    if (queue.length) {
      lines.push('\nUp Next:')
      queue.forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s.title}`)
        if (s.url) lines.push(`     ${s.url}`)
      })
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `music-room-${code}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!room || !user) return null

  const isHost = user.isHost

  return (
    <div
      className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
    >

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 bg-gray-900 border-b border-gray-800 shrink-0 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">🎵</span>
          <span className="font-bold text-base hidden sm:block">Music Room</span>
        </div>

        {/* Room code pill */}
        <button
          onClick={copyCode}
          title="Click to copy room code"
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 transition-colors shrink-0"
        >
          <span className="font-mono font-bold tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm text-white">{code}</span>
          <span className="text-gray-400 text-xs hidden sm:inline">{copied ? '✓' : 'copy'}</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2 text-sm text-gray-400 shrink-0">
          {/* Invite: share link */}
          <button
            onClick={copyInviteLink}
            title={linkCopied ? 'Link copied!' : 'Copy invite link'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors text-base ${
              linkCopied
                ? 'bg-green-700/30 border-green-600 text-green-400'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
            }`}
          >
            {linkCopied ? '✓' : '🔗'}
          </button>
          {/* QR code */}
          <button
            onClick={() => setShowQR(true)}
            title="Show QR code"
            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-base transition-colors"
          >
            📱
          </button>
          {/* Export playlist */}
          <button
            onClick={downloadPlaylist}
            title="Download playlist (.txt)"
            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-base transition-colors"
          >
            💾
          </button>

          <span className="hidden sm:inline">👥 {room.users?.length ?? 0}</span>
          <span className="sm:hidden text-xs">{room.users?.length ?? 0}</span>
          {isHost && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              Host
            </span>
          )}
          {/* Chat toggle — all screen sizes */}
          <button
            onClick={() => { setSidebarOpen(o => !o); setUnread(0) }}
            className="relative w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle chat & users"
          >
            <span className="text-base">💬</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full font-bold leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left/Main: player + controls + queue */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Player */}
          <MusicPlayer
            ref={playerRef}
            currentSong={currentSong}
            playing={playing}
            currentTime={currentTime}
          />

          {/* Controls bar */}
          <div className="px-2 sm:px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-3 shrink-0 overflow-x-auto">
            {isHost
              ? <Controls playing={playing} currentSong={currentSong} repeat={repeat} queueMode={queueMode} currentTime={currentTime} duration={songDuration} />
              : <VoteSkip key={currentSong?.id} votes={votes} currentSong={currentSong} repeat={repeat} queueMode={queueMode} />
            }
          </div>

          {/* Scrollable area: Suggestions (host) + AddSong (all) + Queue */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
            {isHost && <Suggestions suggestions={suggestions} />}
            <AddSong isHost={isHost} />
            <Queue queue={queue} isHost={isHost} />
          </div>
        </div>

        {/* Backdrop — closes sidebar on tap (all screen sizes) */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/60 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right sidebar: users + chat — conditionally rendered so no phantom DOM area exists when closed */}
        {sidebarOpen && (
          <div className="flex flex-col border-l border-gray-800 overflow-hidden bg-gray-950
                          absolute inset-y-0 right-0 z-40 w-72 animate-slide-in-right">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-2 right-2 z-50 text-gray-500 hover:text-white text-sm w-6 h-6 flex items-center justify-center"
              title="Close"
            >
              ✕
            </button>
            <UserList users={room.users} currentUser={user} />
            <Chat chat={chat} user={user} />
          </div>
        )}
      </div>

      {/* Reconnecting overlay */}
      {reconnecting && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">Reconnecting…</p>
          <p className="text-gray-400 text-sm">Trying to rejoin the room</p>
        </div>
      )}

      {/* Now-playing toast */}
      {nowPlaying && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800/95 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl max-w-xs pointer-events-none">
          <span className="text-indigo-400">▶</span>
          <span className="truncate">{nowPlaying}</span>
        </div>
      )}

      {/* Error toast */}
      {state.error && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm z-50 max-w-sm">
          <span>{state.error}</span>
          <button
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            className="opacity-70 hover:opacity-100 font-bold text-base leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Info toast — host restored notification */}
      {state.info && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-xl text-sm z-50 text-center">
          {state.info}
        </div>
      )}

      {/* QR Code modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-4 border border-gray-700 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg">Join Room {code}</h3>
            <p className="text-gray-400 text-sm text-center">Scan with phone camera to join</p>
            <div className="bg-white rounded-xl p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getInviteUrl())}`}
                alt="QR code"
                className="w-48 h-48 rounded"
              />
            </div>
            <p className="text-gray-500 text-xs text-center break-all">{getInviteUrl()}</p>
            <div className="flex gap-2 w-full">
              <button
                onClick={copyInviteLink}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {linkCopied ? '✓ Copied!' : '🔗 Copy Link'}
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
