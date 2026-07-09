import { useState } from 'react'
import { socket } from '../socket.js'

export default function Suggestions({ suggestions = [], coDjMode = false }) {
  const [open, setOpen] = useState(true)

  if (!suggestions.length && !open) return null

  return (
    <div className="bg-gray-900 rounded-xl border border-yellow-500/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-sm font-semibold text-yellow-300">
            Song Suggestions
          </span>
          {suggestions.length > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
              {suggestions.length}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          {coDjMode ? (
            <p className="px-4 py-3 text-indigo-400 text-xs text-center">
              🎧 Co-DJ mode is ON — guests can add songs directly to the queue
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-gray-600 text-xs text-center">
              No pending suggestions — guests can suggest songs below
            </p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {suggestions.map(s => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Thumbnail */}
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt="" className="w-12 h-9 rounded object-cover shrink-0 bg-gray-700" />
                  ) : (
                    <div className="w-12 h-9 rounded bg-gray-700 flex items-center justify-center shrink-0 text-lg">🎵</div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.title}</p>
                    <p className="text-xs text-yellow-400/70">suggested by {s.suggestedBy}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => socket.emit('approve-suggestion', { suggestionId: s.id })}
                      title="Add to queue"
                      className="w-7 h-7 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >✓</button>
                    <button
                      onClick={() => socket.emit('reject-suggestion', { suggestionId: s.id })}
                      title="Reject"
                      className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
