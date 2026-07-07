import { socket } from '../socket.js'

export default function Controls({ playing, currentSong }) {
  if (!currentSong) {
    return (
      <p className="text-gray-500 text-sm">Add a song below to start playing</p>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Play / Pause */}
      <button
        onClick={() => socket.emit(playing ? 'pause' : 'play')}
        className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-full transition-colors text-white shrink-0 text-lg"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* Next */}
      <button
        onClick={() => socket.emit('next-song')}
        className="w-9 h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full transition-colors text-white shrink-0 text-base"
        title="Skip to next song"
      >
        ⏭
      </button>

      {/* Song title */}
      <span className="text-gray-300 text-sm truncate min-w-0">{currentSong.title}</span>
    </div>
  )
}
