import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../socket.js'
import { useRoom } from '../context/RoomContext.jsx'

export default function Home() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('create') // 'create' | 'join'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { dispatch } = useRoom()
  const navigate = useNavigate()

  // Pre-fill code from invite link: /?join=ABC123
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      setCode(joinCode.toUpperCase())
      setMode('join')
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimName = name.trim()
    const trimCode = code.trim()

    if (!trimName) return setError('Enter your display name')
    if (mode === 'join' && !trimCode) return setError('Enter a room code')

    setLoading(true)
    setError('')

    if (!socket.connected) socket.connect()

    const onError = ({ message }) => {
      setError(message)
      setLoading(false)
    }

    socket.once('error', onError)

    if (mode === 'create') {
      socket.once('room-created', ({ roomCode, user, room }) => {
        socket.off('error', onError)
        dispatch({ type: 'SET_ROOM', room, user, currentTime: 0 })
        navigate(`/room/${roomCode}`)
      })
      socket.emit('create-room', { name: trimName })
    } else {
      socket.once('room-joined', ({ room, user, currentTime }) => {
        socket.off('error', onError)
        dispatch({ type: 'SET_ROOM', room, user, currentTime })
        navigate(`/room/${room.code}`)
      })
      socket.emit('join-room', { roomCode: trimCode.toUpperCase(), name: trimName })
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎵</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Music Room</h1>
          <p className="text-gray-400 mt-2">Listen together, in sync</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-5 sm:p-8 shadow-2xl border border-gray-800">

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-800 p-1 mb-6">
            {['create', 'join'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'create' ? 'Create Room' : 'Join Room'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Display name</label>
              <input
                type="text"
                maxLength={30}
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Room code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="ABC123"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-[0.3em] font-mono text-center text-lg placeholder-gray-600"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {loading
                ? 'Connecting…'
                : mode === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          No account needed — share the room code with friends
        </p>
      </div>
    </div>
  )
}
