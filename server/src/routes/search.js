const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Read API key from network.config.json at request time
// (so it picks up changes without server restart)
function getApiKey() {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../../network.config.json'), 'utf-8')
    );
    return cfg.youtubeApiKey || '';
  } catch {
    return '';
  }
}

// GET /api/search?q=query
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: 'YouTube API key not configured' });

  try {
    // Search for embeddable videos only
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('maxResults', '8');
    searchUrl.searchParams.set('key', apiKey);

    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return res.status(searchRes.status).json({
        error: err?.error?.message || 'YouTube API error'
      });
    }

    const data = await searchRes.json();
    const results = (data.items || []).map(item => ({
      videoId:   item.id.videoId,
      title:     item.snippet.title,
      channel:   item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ''
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
