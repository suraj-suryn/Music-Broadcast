export default function UserList({ users = [] }) {
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
          </li>
        ))}
      </ul>
    </div>
  )
}
