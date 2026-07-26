/**
 * config.js
 * -----------------------------------------------------------------------------
 * Central place where the app knows *where* the backend lives and *which*
 * routes to call. Nothing here does any work — it just builds URL strings
 * that the rest of the app (see utils.js -> apiCall) uses.
 *
 * WHERE TO CHANGE THINGS:
 *   - Changing the backend URL? Edit js/env.js (NOT this file).
 *   - Backend added/renamed/removed a route? Update the matching line below.
 * -----------------------------------------------------------------------------
 */

// Falls back to a default if env.js wasn't copied from env.example.js yet.
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://127.0.0.1:8000";

const ENDPOINTS = {
  // Home
  playlists: () => `${API_BASE}/playlists`,

  // Home -> clicking a playlist tile
  playlistSongs: (playlistId) => `${API_BASE}/playlists/${playlistId}/songs`,

  // Search page
  search: (q) => `${API_BASE}/songs/search?q=${encodeURIComponent(q)}`,

  // Queue sources (see player.js)
  songs: () => `${API_BASE}/songs`, // Shuffle Random

  // Shuffle Recommended — the two are mutually exclusive: exactly one of
  // track_id / playlist_id is sent, depending on what the user picked in
  // the "Play Recommended" dialog. Never call both for the same request.
  recommendByTrack: (trackId) => `${API_BASE}/recommend?track_id=${encodeURIComponent(trackId)}`,
  recommendByPlaylist: (playlistId) => `${API_BASE}/recommend?playlist_id=${encodeURIComponent(playlistId)}`,
};
