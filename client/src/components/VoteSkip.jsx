import { useEffect, useState } from 'react'
import { socket } from '../socket.js'

export default function VoteSkip({ votes, currentSong, repeat, queueMode }) {
  const [voted, setVoted] = useState(false)

  // Reset voted state when song changes (component is keyed by song id in Room.jsx)
  useEffect(() => { setVoted(false) }, [currentSong?.id])

  if (!currentSong) {
    return <p className="text-gray-500 text-sm">No song playing</p>
  }

  const { votes: count = 0, total = 0, threshold = 0 } = votes

  function handleVote() {
    socket.emit('vote-skip')
    setVoted(true)
  }

  return (
    <div className="flex items-center gap-3 flex-1">
      <button
        onClick={handleVote}
        disabled={voted}
        className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
      >
        ⏭ {voted ? 'Voted' : 'Vote Skip'}
      </button>

      {count > 0 && (
        <span className="text-gray-400 text-sm">
          {count}/{total} voted · {threshold} needed
        </span>
      )}

      {repeat && (
        <span className="text-indigo-400 text-sm" title="Host has repeat on">🔁</span>
      )}

      {queueMode === 'cycle' && (
        <span className="text-indigo-400 text-sm" title="Queue loop is on">🔄</span>
      )}

      <span className="text-gray-600 text-sm truncate min-w-0 hidden sm:block">
        {currentSong.title}
      </span>
    </div>
  )
}
