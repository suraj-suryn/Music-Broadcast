import { useState, useEffect, useRef } from 'react'
import { socket } from '../socket.js'

export default function Chat({ chat = [], user }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  function handleSend(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    socket.emit('send-message', { text: trimmed })
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Chat header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chat</p>
        <span className="text-xs text-gray-600">everyone can type</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chat.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-6">No messages yet</p>
        )}
        {chat.map((msg, i) => {
          const isOwn = msg.userName === user?.name
          return (
            <div key={i} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-0.5 px-1">{msg.userName}</span>
              <div
                className={`px-3 py-1.5 rounded-xl text-sm max-w-[85%] break-words leading-snug ${
                  isOwn
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-1.5 p-2 border-t border-gray-800 shrink-0">
        <input
          type="text"
          maxLength={500}
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shrink-0"
        >
          ↩
        </button>
      </form>
    </div>
  )
}
