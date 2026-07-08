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

function addToQueue(song) {
  socket.emit('add-to-queue', { song })
}

export default function AddSong() {
  const [tab, setTab] = useState('search') // 'search' | 'url' | 'upload'
  const [ytUrl, setYtUrl] = useState('')
  const [ytLoading, setYtLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState('')
  // Search state
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [searchError, setSearchError] = useState('')

  const serverUrl = import.meta.env.VITE_SERVER_URL || ''

  // ── Search ───────────────────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])

    try {
      const res = await fetch(`${serverUrl}/api/search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 503) {
          setSearchError('YouTube API key not set. Add "youtubeApiKey" to network.config.json.')
        } else {
          setSearchError(data.error || 'Search failed')
        }
        return
      }
      setResults(data.results || [])
      if (!data.results?.length) setSearchError('No embeddable results found. Try a different query.')
    } catch {
      setSearchError('Search request failed. Is the server running?')
    } finally {
      setSearching(false)
    }
  }

  function addSearchResult(r) {
    addToQueue({
      source: 'youtube',
      videoId: r.videoId,
      url: `https://www.youtube.com/watch?v=${r.videoId}`,
      title: r.title,
      thumbnail: r.thumbnail
    })
    // Visual feedback — briefly highlight (handled by parent queue update)
  }

  // ── URL paste ────────────────────────────────────────────
  async function handleAddYT(e) {
    e.preventDefault()
    setError('')
    const match = ytUrl.match(YT_REGEX)
    if (!match) return setError('Could not find a YouTube video ID in that URL')

    const videoId = match[1]
    setYtLoading(true)
    const title = await fetchYTTitle(videoId)
    addToQueue({
      source: 'youtube',
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    })
    setYtUrl('')
    setYtLoading(false)
  }

  // ── File upload ──────────────────────────────────────────
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
      addToQueue({
        source: 'upload',
        url: `${serverUrl}${data.url}`,
        title: data.title,
        thumbnail: null
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

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-800 p-0.5 mb-3 text-xs font-medium">
        {[['search', '🔍 Search'], ['url', '🔗 URL'], ['upload', '📁 Upload']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(''); setSearchError('') }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search tab ─────────────────────────────────── */}
      {tab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search YouTube…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              {searching ? '…' : '🔍'}
            </button>
          </form>

          {searchError && (
            <p className="text-red-400 text-xs mb-2 bg-red-400/10 rounded px-2 py-1">{searchError}</p>
          )}

          {results.length > 0 && (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {results.map(r => (
                <li key={r.videoId}>
                  <button
                    onClick={() => addSearchResult(r)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left group"
                  >
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="w-14 h-10 rounded object-cover shrink-0 bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate group-hover:text-indigo-300">{r.title}</p>
                      <p className="text-gray-500 text-xs truncate">{r.channel}</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-indigo-400 text-sm shrink-0">＋</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!results.length && !searching && !searchError && (
            <p className="text-gray-600 text-xs text-center py-3">
              Search shows only embeddable videos
            </p>
          )}
        </div>
      )}

      {/* ── URL tab ────────────────────────────────────── */}
      {tab === 'url' && (
        <form onSubmit={handleAddYT} className="flex flex-col sm:flex-row gap-2">
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
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto sm:shrink-0"
          >
            {ytLoading ? '…' : '▶ Add'}
          </button>
        </form>
      )}

      {/* ── Upload tab ─────────────────────────────────── */}
      {tab === 'upload' && (
        <label className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 text-sm cursor-pointer transition-colors select-none ${
          uploadLoading
            ? 'border-gray-700 text-gray-600 cursor-not-allowed'
            : 'border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400'
        }`}>
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
      )}

      {error && (
        <p className="text-red-400 text-xs mt-2 bg-red-400/10 rounded px-2 py-1">{error}</p>
      )}
    </div>
  )
}
