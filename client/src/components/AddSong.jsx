import { useState } from 'react'
import { socket } from '../socket.js'
import { useRoom } from '../context/RoomContext.jsx'

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

function suggestSong(song) {
  socket.emit('suggest-song', { song })
}

export default function AddSong({ isHost = true, coDjMode = false }) {
  // isHost=true OR coDjMode=true → songs go directly to queue
  // isHost=false AND coDjMode=false → songs become suggestions for host to approve
  const effectiveHost = isHost || coDjMode
  const { state: { queue, currentSong } } = useRoom()

  // Check if a song is already playing or queued
  function isDuplicate(song) {
    const all = [...queue, ...(currentSong ? [currentSong] : [])]
    if (song.videoId) return all.some(s => s.videoId === song.videoId)
    return all.some(s => s.url === song.url)
  }

  const [tab, setTab] = useState('search') // 'search' | 'url' | 'upload' | 'import'
  const [ytUrl, setYtUrl] = useState('')
  const [audioTitle, setAudioTitle] = useState('')
  const [ytLoading, setYtLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggested, setSuggested] = useState('') // brief "✓ Suggested!" feedback for guests
  const [dupWarning, setDupWarning] = useState('') // duplicate song warning
  // Search state
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [searchError, setSearchError] = useState('')
  // Import state
  const [importProgress, setImportProgress] = useState(null)
  const [importDone, setImportDone] = useState('')

  const serverUrl = import.meta.env.VITE_SERVER_URL || ''

  // Route song to queue (host/co-DJ) or suggestion (guest)
  function submitSong(song) {
    if (effectiveHost && isDuplicate(song)) {
      setDupWarning(`⚠️ "${song.title}" is already in the queue or playing`)
      setTimeout(() => setDupWarning(''), 3500)
      return
    }
    if (effectiveHost) addToQueue(song)
    else {
      suggestSong(song)
      setSuggested(`✓ "${song.title}" suggested!`)
      setTimeout(() => setSuggested(''), 3000)
    }
  }

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
    submitSong({
      source: 'youtube',
      videoId: r.videoId,
      url: `https://www.youtube.com/watch?v=${r.videoId}`,
      title: r.title,
      thumbnail: r.thumbnail
    })
    // Clear results so the list doesn't clutter after adding
    setResults([])
    setQuery('')
  }

  // ── URL (YouTube or direct audio link) ─────────────────────────
  async function handleAddUrl(e) {
    e.preventDefault()
    setError('')
    const trimmedUrl = ytUrl.trim()
    if (!trimmedUrl) return

    // YouTube URL
    const match = trimmedUrl.match(YT_REGEX)
    if (match) {
      const videoId = match[1]
      setYtLoading(true)
      const title = await fetchYTTitle(videoId)
      submitSong({
        source: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      })
      setYtUrl('')
      setAudioTitle('')
      setYtLoading(false)
      return
    }

    // Direct audio link
    try { new URL(trimmedUrl) } catch { return setError('Enter a valid URL') }
    const pathParts = new URL(trimmedUrl).pathname.split('/').filter(Boolean)
    const filename = pathParts[pathParts.length - 1] ?? ''
    const autoTitle = decodeURIComponent(filename)
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim()
    const title = audioTitle.trim() || autoTitle || 'Audio Link'
    submitSong({ source: 'upload', url: trimmedUrl, title, thumbnail: null })
    setYtUrl('')
    setAudioTitle('')
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
      submitSong({
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

  // ── Playlist import ──────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setImportProgress(null); setImportDone('')
    const text = await file.text()
    // Extract every YouTube URL from the file regardless of format
    const matches = [...text.matchAll(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g)]
    const videoIds = [...new Set(matches.map(m => m[1]))] // deduplicate
    if (!videoIds.length) { setError('No YouTube URLs found in the file'); e.target.value = ''; return }

    // Fetch all titles in parallel
    setImportProgress(`Fetching titles for ${videoIds.length} song${videoIds.length !== 1 ? 's' : ''}…`)
    const songs = await Promise.all(videoIds.map(async (videoId) => ({
      source: 'youtube',
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: await fetchYTTitle(videoId),
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    })))

    // Add to queue / suggest one by one
    songs.forEach((song, i) => {
      setImportProgress(`${isHost ? 'Adding' : 'Suggesting'} ${i + 1} / ${songs.length}…`)
      submitSong(song)
    })
    setImportProgress(null)
    setImportDone(`✅ ${isHost ? 'Added' : 'Suggested'} ${songs.length} song${songs.length !== 1 ? 's' : ''}`)
    e.target.value = ''
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        {isHost ? 'Add Song' : '💡 Suggest a Song'}        {!isHost && coDjMode && <span className="ml-2 text-xs text-indigo-400 font-normal">🎧 Co-DJ mode</span>}      </h3>

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-800 p-0.5 mb-3 text-xs font-medium">
        {[['search', '🔍 Search'], ['url', '🔗 URL'], ['upload', '📁 Upload'], ['import', '📋 Import']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(''); setSearchError(''); setImportDone('') }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Guest hint + suggestion feedback */}
      {!effectiveHost && (
        <p className="text-indigo-400/70 text-xs mb-2">Songs you add will be sent to the host for approval.</p>
      )}
      {!isHost && coDjMode && (
        <p className="text-indigo-400/70 text-xs mb-2">🎧 Co-DJ mode is ON — your songs go directly to the queue!</p>
      )}
      {suggested && (
        <p className="text-green-400 text-xs mb-2 bg-green-400/10 rounded px-2 py-1">{suggested}</p>
      )}
      {dupWarning && (
        <p className="text-yellow-400 text-xs mb-2 bg-yellow-400/10 rounded px-2 py-1">{dupWarning}</p>
      )}

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
                    <span className="text-gray-600 group-hover:text-indigo-400 text-sm shrink-0">
                      {effectiveHost ? '＋' : '💡'}
                    </span>
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
        <form onSubmit={handleAddUrl} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="YouTube URL or direct audio link (mp3, wav, ogg…)"
              value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={ytLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              {ytLoading ? '…' : '▶ Add'}
            </button>
          </div>
          {/* Title input — shown for non-YouTube links so user can name the track */}
          {ytUrl.trim() && !ytUrl.match(YT_REGEX) && (
            <input
              type="text"
              placeholder="Song title (optional, auto-detected from URL)"
              value={audioTitle}
              onChange={e => setAudioTitle(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
            />
          )}
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

      {/* ── Import tab ─────────────────────────────────── */}
      {tab === 'import' && (
        <div className="flex flex-col gap-2">
          <p className="text-gray-500 text-xs">
            Upload a <span className="text-gray-300">.txt</span> file with YouTube URLs — one per line, or a previously exported playlist.
          </p>
          <label className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 text-sm cursor-pointer transition-colors select-none ${
            importProgress
              ? 'border-gray-700 text-gray-600 cursor-not-allowed'
              : 'border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400'
          }`}>
            <span className="text-base">📋</span>
            <span>{importProgress || 'Choose playlist .txt file'}</span>
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              disabled={!!importProgress}
              onChange={handleImport}
            />
          </label>
          {importDone && (
            <p className="text-green-400 text-xs bg-green-400/10 rounded px-2 py-1">{importDone}</p>
          )}
          <p className="text-gray-600 text-xs">
            Tip: save a playlist from a previous session using the 💾 button in the room header.
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-2 bg-red-400/10 rounded px-2 py-1">{error}</p>
      )}
    </div>
  )
}
