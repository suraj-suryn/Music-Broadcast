import { socket } from '../socket.js'

export default function Queue({ queue = [], isHost }) {
  if (queue.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center text-gray-500 text-sm">
        Queue is empty
      </div>
    )
  }

  function move(fromIndex, toIndex) {
    socket.emit('reorder-queue', { fromIndex, toIndex })
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Up Next</h3>
        <span className="text-xs text-gray-500">{queue.length} song{queue.length !== 1 ? 's' : ''}</span>
      </div>

      <ul className="divide-y divide-gray-800">
        {queue.map((song, idx) => (
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

            {/* Info — clickable by host to play immediately */}
            <div
              className={`flex-1 min-w-0 ${isHost ? 'cursor-pointer group/play' : ''}`}
              onClick={isHost ? () => socket.emit('jump-to-song', { songId: song.id }) : undefined}
              title={isHost ? 'Click to play now' : undefined}
            >
              <div className="flex items-center gap-1 min-w-0">
                {isHost && (
                  <span className="text-indigo-400 opacity-0 group-hover/play:opacity-100 transition-opacity text-xs shrink-0">▶</span>
                )}
                <p className="text-sm text-white truncate group-hover/play:text-indigo-300 transition-colors">{song.title}</p>
              </div>
              <p className="text-xs text-gray-500 capitalize">{song.source}</p>
            </div>

            {/* Host: reorder + remove */}
            {isHost && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-xs"
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === queue.length - 1}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors text-xs"
                  title="Move down"
                >▼</button>
                <button
                  onClick={() => socket.emit('remove-from-queue', { songId: song.id })}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors text-sm ml-1"
                  title="Remove from queue"
                >✕</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
