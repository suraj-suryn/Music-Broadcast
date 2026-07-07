import { socket } from '../socket.js'

export default function Queue({ queue = [], isHost }) {
  if (queue.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center text-gray-500 text-sm">
        Queue is empty
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Up Next</h3>
        <span className="text-xs text-gray-500">{queue.length} song{queue.length !== 1 ? 's' : ''}</span>
      </div>

      <ul className="divide-y divide-gray-800">
        {queue.map(song => (
          <li key={song.id} className="flex items-center gap-3 px-4 py-2.5">
            {/* Thumbnail */}
            {song.thumbnail ? (
              <img
                src={song.thumbnail}
                alt=""
                className="w-12 h-9 rounded object-cover shrink-0 bg-gray-700"
              />
            ) : (
              <div className="w-12 h-9 rounded bg-gray-700 flex items-center justify-center shrink-0 text-lg">
                🎵
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{song.title}</p>
              <p className="text-xs text-gray-500 capitalize">{song.source}</p>
            </div>

            {/* Remove (host only) */}
            {isHost && (
              <button
                onClick={() => socket.emit('remove-from-queue', { songId: song.id })}
                className="text-gray-600 hover:text-red-400 transition-colors shrink-0 text-sm px-1"
                title="Remove from queue"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
