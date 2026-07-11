import { useState } from 'react'
import { socket } from '../socket.js'

export default function UserList({ users = [], currentUser }) {
  const amHost = currentUser?.isHost
  const amCreator = currentUser?.isCreator
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function startEdit(u) {
    setEditingId(u.id)
    setEditName(u.name)
  }

  function submitRename(e) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (trimmed) socket.emit('rename-user', { name: trimmed })
    setEditingId(null)
  }

  return (
    <div className="p-3 border-b border-gray-800 shrink-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        In Room ({users.length})
      </p>
      <ul className="space-y-1.5">
        {users.map(u => {
          const isMe = u.id === currentUser?.id
          return (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />

              {/* Inline rename for own row */}
              {editingId === u.id ? (
                <form onSubmit={submitRename} className="flex-1 flex gap-1 min-w-0">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={30}
                    className="flex-1 min-w-0 bg-gray-800 border border-indigo-500 text-white rounded px-1.5 py-0.5 text-xs focus:outline-none"
                  />
                  <button type="submit" className="text-green-400 text-xs px-1">✓</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 text-xs px-1">✕</button>
                </form>
              ) : (
                <>
                  <span className={`truncate flex-1 ${isMe ? 'text-white' : 'text-gray-200'}`}>
                    {u.name}{isMe && <span className="text-gray-600 text-xs ml-1">(you)</span>}
                  </span>

                  {/* Role badges */}
                  {u.isCreator && (
                    <span className="text-yellow-400 text-xs shrink-0" title="Room creator">👑</span>
                  )}
                  {u.isHost && !u.isCreator && (
                    <span className="text-indigo-400 text-xs shrink-0" title="Co-host">🎧</span>
                  )}

                  {/* Rename own name */}
                  {isMe && (
                    <button
                      onClick={() => startEdit(u)}
                      title="Rename yourself"
                      className="text-gray-600 hover:text-indigo-400 text-xs transition-colors shrink-0"
                    >✏️</button>
                  )}

                  {/* Host actions on OTHER users */}
                  {amHost && !isMe && (
                    <>
                      {/* Share control with a guest */}
                      {!u.isHost && (
                        <button
                          onClick={() => socket.emit('share-control', { toUserId: u.id })}
                          title={`Share control with ${u.name}`}
                          className="text-gray-600 hover:text-yellow-400 text-xs transition-colors shrink-0"
                        >👑</button>
                      )}
                      {/* Revoke control from a co-host (not creator) */}
                      {u.isHost && !u.isCreator && (
                        <button
                          onClick={() => socket.emit('revoke-control', { fromUserId: u.id })}
                          title={`Revoke control from ${u.name}`}
                          className="text-gray-600 hover:text-orange-400 text-xs transition-colors shrink-0"
                        >↩</button>
                      )}
                      {/* Kick non-host or non-creator users */}
                      {!u.isCreator && (
                        <button
                          onClick={() => { if (window.confirm(`Remove ${u.name} from the room?`)) socket.emit('kick-user', { userId: u.id }) }}
                          title={`Kick ${u.name}`}
                          className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0"
                        >🚫</button>
                      )}
                    </>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
