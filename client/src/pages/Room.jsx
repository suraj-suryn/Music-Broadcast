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
  const { room, user, currentSong, playing, currentTime, queue, chat, votes } = state
  const playerRef = useRef(null)
  const [copied, setCopied] = useState(false)

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
    socket.on('error', onError)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('playback-sync', onPlaybackSync)
      socket.off('queue-updated', onQueueUpdated)
      socket.off('new-message', onNewMessage)
      socket.off('user-joined', onUserJoined)
      socket.off('user-left', onUserLeft)
      socket.off('vote-updated', onVoteUpdated)
      socket.off('error', onError)
      socket.off('disconnect', onDisconnect)
    }
  }, [room, user, navigate, dispatch])

  // Update page title with room code
  useEffect(() => {
    if (code) document.title = `🎵 Room ${code}`
    return () => { document.title = 'Music Room' }
  }, [code])

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (!room || !user) return null

  const isHost = user.isHost

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0 gap-3">
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
          <span className="text-gray-400 text-xs">{copied ? '✓ copied' : 'copy'}</span>
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
          <span>👥 {room.users?.length ?? 0}</span>
          {isHost && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
              Host
            </span>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

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
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-3 shrink-0">
            {isHost
              ? <Controls playing={playing} currentSong={currentSong} />
              : <VoteSkip key={currentSong?.id} votes={votes} currentSong={currentSong} />
            }
          </div>

          {/* Scrollable area: AddSong (host) + Queue */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isHost && <AddSong />}
            <Queue queue={queue} isHost={isHost} />
          </div>
        </div>

        {/* Right sidebar: users + chat */}
        <div className="w-64 flex flex-col border-l border-gray-800 shrink-0 overflow-hidden">
          <UserList users={room.users} />
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
    </div>
  )
}
