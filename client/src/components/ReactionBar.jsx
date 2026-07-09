import { useEffect, useState } from 'react'
import { socket } from '../socket.js'

const EMOJIS = ['😊', '😢', '😭', '😡', '🔥', '❤️', '👏', '😂']

export default function ReactionBar({ reactions, onReact }) {
  return (
    <div className="relative">
      {/* Floating emoji layer */}
      <div className="absolute bottom-full left-0 right-0 pointer-events-none overflow-hidden h-52">
        {reactions.map(r => (
          <span
            key={r.id}
            className="absolute bottom-0 text-3xl animate-float-up select-none"
            style={{ left: `${r.x}%` }}
            title={r.name}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900/80 border-t border-gray-800">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition-transform duration-100 select-none leading-none p-1 rounded-lg hover:bg-gray-800"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
