import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket.js'
import { useRoom } from '../context/RoomContext.jsx'
import MusicPlayer from '../components/MusicPlayer.jsx'
import Controls from '../components/Controls.jsx'
import Queue from '../components/Queue.jsx'
import AddSong from '../components/AddSong.jsx'
import Chat from '../components/Chat.jsx'
import UserList from '../components/UserList.jsx'
import VoteSkip from '../components/VoteSkip.jsx'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useRoom()
  const { room, user, currentSong, playing, currentTime, queue, chat, votes, repeat, queueMode } = state
  const playerRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  // Sidebar: open by default on md+, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [unread, setUnread] = useState(0)
  const prevChatLen = useRef(0)

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
      dispatch({ type: 'SET_ERROR', message })
    }
    function onDisconnect() {
      navigate('/', { replace: true })
    }

    socket.on('playback-sync', onPlaybackSync)
    socket.on('queue-updated', onQueueUpdated)
    socket.on('new-message', onNewMessage)
    socket.on('user-joined', onUserJoined)
    socket.on('user-left', onUserLeft)
    socket.on('vote-updated', onVoteUpdated)
    socket.on('repeat-changed', onRepeatChanged)
    socket.on('host-transferred', onHostTransferred)
    socket.on('queue-mode-changed', onQueueModeChanged)
    socket.on('error', onError)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('playback-sync', onPlaybackSync)
      socket.off('queue-updated', onQueueUpdated)
      socket.off('new-message', onNewMessage)
      socket.off('user-joined', onUserJoined)
      socket.off('user-left', onUserLeft)
      socket.off('vote-updated', onVoteUpdated)
      socket.off('repeat-changed', onRepeatChanged)
      socket.off('host-transferred', onHostTransferred)
      socket.off('queue-mode-changed', onQueueModeChanged)
      socket.off('error', onError)
      socket.off('disconnect', onDisconnect)
    }
  }, [room, user, navigate, dispatch])

  // Update page title with room code
  useEffect(() => {
    if (code) document.title = `🎵 Room ${code}`
    return () => { document.title = 'Music Room' }
  }, [code])

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
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <span className="font-mono font-bold tracking-[0.2em] text-sm text-white">{code}</span>
          <span className="text-gray-400 text-xs">{copied ? '\u2713 copied' : 'copy'}</span>
        </button>

        {/* Invite: share link + QR */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyInviteLink}
            title="Copy invite link"
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-1.5 text-xs transition-colors"
          >
            <span>\uD83D\uDD17</span>
            <span className="hidden sm:inline text-gray-300">{linkCopied ? '\u2713 Copied!' : 'Invite'}</span>
          </button>
          <button
            onClick={() => setShowQR(true)}
            title="Show QR code"
            className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
          >
            \uD83D\uDCF1
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
          <span>👥 {room.users?.length ?? 0}</span>
          {isHost && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
              Host
            </span>
          )}
          {/* Chat toggle — mobile only */}
          <button
            onClick={() => { setSidebarOpen(o => !o); setUnread(0) }}
            className="md:hidden relative w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
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
              ? <Controls playing={playing} currentSong={currentSong} repeat={repeat} queueMode={queueMode} />
              : <VoteSkip key={currentSong?.id} votes={votes} currentSong={currentSong} repeat={repeat} queueMode={queueMode} />
            }
          </div>

          {/* Scrollable area: AddSong (host) + Queue */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
            {isHost && <AddSong />}
            <Queue queue={queue} isHost={isHost} />
          </div>
        </div>

        {/* Backdrop — mobile only, closes sidebar on tap */}
        {sidebarOpen && (
          <div
            className="md:hidden absolute inset-0 bg-black/60 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right sidebar: users + chat
            Mobile  → fixed overlay sliding from right (z-40)
            Tablet+ → always-visible column                  */}
        <div className={`
          flex flex-col border-l border-gray-800 overflow-hidden bg-gray-950
          transition-transform duration-200 md:transition-none
          absolute inset-y-0 right-0 z-40 w-72
          md:relative md:w-64 md:translate-x-0 md:z-auto md:shrink-0
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-2 right-2 z-50 text-gray-500 hover:text-white text-sm w-6 h-6 flex items-center justify-center"
            title="Close"
          >
            ✕
          </button>
          <UserList users={room.users} currentUser={user} />
          <Chat chat={chat} user={user} />
        </div>
      </div>

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
