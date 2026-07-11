import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { socket } from '../socket.js'
import { useRoom } from '../context/RoomContext.jsx'

export default function Home() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'join'
  const [joinLocked, setJoinLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [waitingApproval, setWaitingApproval] = useState(false)
  const [error, setError] = useState('')
  const { dispatch } = useRoom()
  const navigate = useNavigate()
  const location = useLocation()
  const [kicked, setKicked] = useState(!!location.state?.kicked)

  // Auto-dismiss the kicked banner after 4 s
  useEffect(() => {
    if (!kicked) return
    const t = setTimeout(() => setKicked(false), 4000)
    return () => clearTimeout(t)
  }, [kicked])

  // Pre-fill code from invite link: /?join=ABC123
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      setCode(joinCode.toUpperCase())
      setMode('join')
      setJoinLocked(true)
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

    const onError = ({ message, needsPassword }) => {
      setError(message)
      setLoading(false)
      setWaitingApproval(false)
      if (needsPassword) setShowPasswordField(true)
    }

    socket.once('error', onError)

    if (mode === 'create') {
      socket.once('room-created', ({ roomCode, user, room }) => {
        socket.off('error', onError)
        sessionStorage.setItem('music-room', JSON.stringify({ roomCode, userName: trimName }))
        dispatch({ type: 'SET_ROOM', room, user, currentTime: 0 })
        navigate(`/room/${roomCode}`)
      })
      socket.emit('create-room', { name: trimName, password: password.trim() })
    } else {
      socket.once('room-joined', ({ room, user, currentTime }) => {
        socket.off('error', onError)
        socket.off('join-request-received', onWaiting)
        socket.off('join-rejected', onRejected)
        sessionStorage.setItem('music-room', JSON.stringify({ roomCode: room.code, userName: trimName }))
        dispatch({ type: 'SET_ROOM', room, user, currentTime })
        navigate(`/room/${room.code}`)
      })

      function onWaiting() {
        socket.off('error', onError)
        setLoading(false)
        setWaitingApproval(true)
      }
      function onRejected({ reason }) {
        socket.off('error', onError)
        setWaitingApproval(false)
        setLoading(false)
        setError(reason || 'Your request to join was declined.')
      }
      socket.once('join-request-received', onWaiting)
      socket.once('join-rejected', onRejected)

      socket.emit('join-room', { roomCode: trimCode.toUpperCase(), name: trimName, password: password.trim() })
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {kicked && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <span>🚫</span>
          <span>You were removed from the room.</span>
          <button onClick={() => setKicked(false)} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
        </div>
      )}
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
                onClick={() => !joinLocked && switchMode(m)}
                disabled={joinLocked && m === 'create'}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow'
                    : joinLocked && m === 'create'
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'create' ? 'Create Room' : 'Join Room'}
              </button>
            ))}
          </div>
          {joinLocked && (
            <p className="text-xs text-indigo-400 text-center -mt-4 mb-4">
              📨 You were invited — enter your name to join
            </p>
          )}

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

            {/* Password field — shown for join when room requires it, or for create */}
            {(showPasswordField || mode === 'create') && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {mode === 'create' ? 'Room password (optional)' : 'Room password'}
                </label>
                <input
                  type="password"
                  placeholder={mode === 'create' ? 'Leave blank for no password' : 'Enter room password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
                />
                {mode === 'create' && (
                  <p className="text-gray-600 text-xs mt-1.5">
                    💡 Tip: also enable <span className="text-gray-400">Join Approval</span> inside the room for full control
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Waiting for host approval */}
            {waitingApproval ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-indigo-300 text-sm text-center">Waiting for the host to let you in…</p>
                <button
                  type="button"
                  onClick={() => { setWaitingApproval(false); setLoading(false) }}
                  className="text-gray-500 hover:text-white text-xs transition-colors"
                >Cancel</button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mt-2"
              >
                {loading ? 'Connecting…' : mode === 'create' ? 'Create Room' : 'Join Room'}
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          No account needed — share the room code with friends
        </p>
      </div>
    </div>
  )
}
