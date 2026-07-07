import { useState } from 'react'
import { socket } from '../socket.js'

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

async function fetchYTTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (!res.ok) return `YouTube – ${videoId}`
    const data = await res.json()
    return data.title || `YouTube – ${videoId}`
  } catch {
    return `YouTube – ${videoId}`
  }
}

export default function AddSong() {
  const [ytUrl, setYtUrl] = useState('')
  const [ytLoading, setYtLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState('')

  const serverUrl = import.meta.env.VITE_SERVER_URL || ''

  async function handleAddYT(e) {
    e.preventDefault()
    setError('')
    const match = ytUrl.match(YT_REGEX)
    if (!match) return setError('Could not find a YouTube video ID in that URL')

    const videoId = match[1]
    setYtLoading(true)

    const title = await fetchYTTitle(videoId)
    socket.emit('add-to-queue', {
      song: {
        source: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      }
    })
    setYtUrl('')
    setYtLoading(false)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setUploadLoading(true)

    const form = new FormData()
    form.append('audio', file)

    try {
      const res = await fetch(`${serverUrl}/api/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      socket.emit('add-to-queue', {
        song: {
          source: 'upload',
          url: `${serverUrl}${data.url}`,
          title: data.title,
          thumbnail: null
        }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Song</h3>

      {/* YouTube URL */}
      <form onSubmit={handleAddYT} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="e.g. https://youtu.be/dQw4w9WgXcQ"
          value={ytUrl}
          onChange={e => setYtUrl(e.target.value)}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={ytLoading}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          {ytLoading ? '…' : '▶ Add'}
        </button>
      </form>

      {/* Embeddable tip */}
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
        ⚠️ Some videos block embedding. Works best with: indie artists, Lofi channels,
        VEVO, or try: <span className="text-gray-500 font-mono">youtu.be/dQw4w9WgXcQ</span>
      </p>

      {/* File upload */}
      <label
        className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors select-none ${
          uploadLoading
            ? 'border-gray-700 text-gray-600 cursor-not-allowed'
            : 'border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400'
        }`}
      >
        <span className="text-base">📁</span>
        <span>{uploadLoading ? 'Uploading…' : 'Upload MP3 / WAV (max 50 MB)'}</span>
        <input
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
          className="hidden"
          disabled={uploadLoading}
          onChange={handleFileUpload}
        />
      </label>

      {error && (
        <p className="text-red-400 text-xs mt-2 bg-red-400/10 rounded px-2 py-1">{error}</p>
      )}
    </div>
  )
}
