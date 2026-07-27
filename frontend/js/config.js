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

  // Search page (plain text search)
  search: (q) => `${API_BASE}/songs/search?q=${encodeURIComponent(q)}`,

  // Health Check / Root page
  health: () => `${API_BASE}/`,

  // Random songs for testing
  random: () => `${API_BASE}/songs/random`,

  // Player page's "Recommend Similar Songs" button and the Playlist
  // page's recommend button both queue results via queueSongs() (see
  // player.js). track_id / playlist_id / artists are mutually exclusive
  // across these — never combine them in one call.
  recommendByTrack: (trackId) => `${API_BASE}/recommend?track_id=${encodeURIComponent(trackId)}`,
  recommendByArtists: (artists) => `${API_BASE}/recommend?artists=${encodeURIComponent(artists)}`,
  recommendByPlaylist: (playlistId) => `${API_BASE}/recommend?playlist_id=${encodeURIComponent(playlistId)}`,
};
