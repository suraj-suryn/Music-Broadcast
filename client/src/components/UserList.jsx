import { socket } from '../socket.js'

export default function UserList({ users = [], currentUser }) {
  const amHost = currentUser?.isHost

  return (
    <div className="p-3 border-b border-gray-800 shrink-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        In Room ({users.length})
      </p>
      <ul className="space-y-1.5">
        {users.map(u => (
          <li key={u.id} className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            <span className="text-gray-200 truncate flex-1">{u.name}</span>
            {u.isHost && (
              <span className="text-yellow-400 text-xs" title="Host">👑</span>
            )}
            {/* Host-only: transfer button shown on non-host users */}
            {amHost && !u.isHost && (
              <button
                onClick={() => socket.emit('transfer-host', { toUserId: u.id })}
                title={`Make ${u.name} the host`}
                className="text-gray-600 hover:text-yellow-400 text-xs transition-colors shrink-0"
              >
                👑
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
