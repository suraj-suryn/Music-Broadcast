import { socket } from '../socket.js'

export default function Controls({ playing, currentSong, repeat, queueMode }) {
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

      {/* Repeat toggle */}
      <button
        onClick={() => socket.emit('set-repeat', { repeat: !repeat })}
        title={repeat ? 'Repeat ON — click to turn off' : 'Repeat OFF — click to loop this song'}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-base shrink-0 ${
          repeat
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white'
        }`}
      >
        🔁
      </button>

      {/* Queue loop toggle */}
      <button
        onClick={() => socket.emit('set-queue-mode', { mode: queueMode === 'cycle' ? 'consume' : 'cycle' })}
        title={queueMode === 'cycle' ? 'Queue loop ON — click to turn off' : 'Queue loop OFF — click to loop queue'}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-base shrink-0 ${
          queueMode === 'cycle'
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white'
        }`}
      >
        🔄
      </button>

      {/* Song title — hidden on xs, shown on sm+ */}
      <span className="text-gray-300 text-sm truncate min-w-0 hidden sm:inline">{currentSong.title}</span>
    </div>
  )
}
