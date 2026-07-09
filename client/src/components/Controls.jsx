import { useEffect, useState } from 'react'
import { socket } from '../socket.js'

// Derive unified repeat mode from server state
function getRepeatMode(repeat, queueMode) {
  if (repeat) return 'one'
  if (queueMode === 'cycle') return 'all'
  return 'off'
}

function cycleRepeat(current) {
  if (current === 'off') {
    socket.emit('set-queue-mode', { mode: 'cycle' })
    socket.emit('set-repeat', { repeat: false })
  } else if (current === 'all') {
    socket.emit('set-queue-mode', { mode: 'consume' })
    socket.emit('set-repeat', { repeat: true })
  } else {
    socket.emit('set-repeat', { repeat: false })
    socket.emit('set-queue-mode', { mode: 'consume' })
  }
}

const REPEAT_ICON  = { off: '🔁', all: '🔁', one: '🔂' }
const REPEAT_TITLE = { off: 'Repeat: Off', all: 'Repeat: All', one: 'Repeat: One' }

export default function Controls({ playing, currentSong, repeat, queueMode, currentTime, syncTimestamp, duration, coDjMode }) {
  if (!currentSong) {
    return (
      <p className="text-gray-500 text-sm">Add a song below to start playing</p>
    )
  }

  const repeatMode = getRepeatMode(repeat, queueMode)

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      {/* ── Button row ── */}
      <div className="flex items-center gap-3">
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

        {/* Repeat cycle: Off → All → One → Off */}
        <button
          onClick={() => cycleRepeat(repeatMode)}
          title={REPEAT_TITLE[repeatMode]}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-base shrink-0 text-white ${
            repeatMode !== 'off' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {REPEAT_ICON[repeatMode]}
        </button>

        {/* Co-DJ toggle */}
        <button
          onClick={() => socket.emit('set-codj-mode', { enabled: !coDjMode })}
          title={coDjMode ? 'Co-DJ ON — click to turn off (guests can add directly)' : 'Co-DJ OFF — click to let guests add songs directly'}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-base shrink-0 text-white ${
            coDjMode ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          🎧
        </button>

        {/* Song title */}
        <span className="text-gray-300 text-sm truncate min-w-0 hidden sm:inline">{currentSong.title}</span>
      </div>

      {/* ── Seek / Progress bar ── */}
      <SeekBar
        playing={playing}
        currentTime={currentTime}
        syncTimestamp={syncTimestamp}
        duration={duration}
      />
    </div>
  )
}

function formatTime(s) {
  if (!s || isNaN(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function SeekBar({ playing, currentTime, syncTimestamp, duration }) {
  const [displayTime, setDisplayTime] = useState(currentTime || 0)

  // Smooth local timer — resets whenever server sends new currentTime
  useEffect(() => {
    setDisplayTime(currentTime || 0)
    if (!playing) return
    const start = Date.now()
    const base  = currentTime || 0
    const t = setInterval(() => {
      setDisplayTime(base + (Date.now() - start) / 1000)
    }, 250)
    return () => clearInterval(t)
  }, [playing, currentTime])

  const pct = duration > 0 ? Math.min((displayTime / duration) * 100, 100) : 0

  function handleClick(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    socket.emit('seek', { time: ratio * duration })
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-gray-500 text-xs tabular-nums w-8 shrink-0">{formatTime(displayTime)}</span>
      <div
        className={`relative flex-1 h-1.5 bg-gray-700 rounded-full group ${duration ? 'cursor-pointer' : ''}`}
        onClick={duration ? handleClick : undefined}
      >
        <div
          className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-none"
          style={{ width: `${pct}%` }}
        />
        {duration > 0 && (
          <div
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          />
        )}
      </div>
      <span className="text-gray-500 text-xs tabular-nums w-8 shrink-0 text-right">{formatTime(duration)}</span>
    </div>
  )
}
