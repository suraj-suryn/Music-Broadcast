import { socket } from '../socket.js'

export default function PendingUsers({ pendingUsers = [], requireApproval, isHost }) {
  if (!isHost) return null

  return (
    <div className={`bg-gray-900 rounded-xl overflow-hidden border ${
      pendingUsers.length > 0 ? 'border-blue-500/40' : 'border-gray-800'
    }`}>
      {/* Header with toggle */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🚪</span>
          <span className="text-sm font-semibold text-gray-300">Join Approval</span>
          {pendingUsers.length > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
              {pendingUsers.length}
            </span>
          )}
        </div>
        {/* Require approval toggle */}
        <button
          onClick={() => socket.emit('set-require-approval', { enabled: !requireApproval })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            requireApproval ? 'bg-indigo-600' : 'bg-gray-700'
          }`}
          title={requireApproval ? 'Approval required — click to allow anyone' : 'Anyone can join — click to require approval'}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            requireApproval ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Pending list */}
      {requireApproval && (
        pendingUsers.length === 0 ? (
          <p className="px-4 py-3 text-gray-600 text-xs text-center">
            No one waiting — share the room code to invite people
          </p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {pendingUsers.map(p => (
              <li key={p.socketId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base">👤</span>
                <span className="flex-1 text-sm text-white truncate">{p.name}</span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => socket.emit('approve-join', { socketId: p.socketId })}
                    title="Let in"
                    className="w-7 h-7 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >✓</button>
                  <button
                    onClick={() => socket.emit('reject-join', { socketId: p.socketId })}
                    title="Decline"
                    className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                  >✕</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
