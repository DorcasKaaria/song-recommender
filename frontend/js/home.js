/**
 * home.js
 * -----------------------------------------------------------------------------
 * Home page: GET /playlists
 * Shows a grid of playlist tiles (thumbnail + title), Spotify-home-style,
 * plus a time-of-day greeting. Clicking a tile does NOT start playing it —
 * it opens the Playlist page (see playlistPage.js) so you can see the full
 * track list first; playback only starts once you press Play or pick a
 * specific song there.
 *
 * FIELD NAMES: each playlist object is { id, name, description, followers,
 * public, collaborative, thumbnail_url, track_count }. id/name/
 * thumbnail_url are used on this page; the rest (plus description) are
 * used on the Playlist page.
 *
 * ALL_PLAYLISTS holds the most recent list returned by the backend. It's
 * also read by player.js's "Play Recommended" dialog (to list playlists
 * you can base recommendations on) and by playlistPage.js (to look up a
 * playlist's own metadata by id) without a second fetch.
 * -----------------------------------------------------------------------------
 */

let ALL_PLAYLISTS = [];

function setGreeting() {
  document.getElementById('homeGreeting').textContent = getGreeting();
}

function playlistTileHTML(playlist) {
  const thumb = playlist.thumbnail_url
    ? `<img src="${escapeHTML(playlist.thumbnail_url)}" alt="" loading="lazy">`
    : `<div class="playlist-tile-fallback">🎵</div>`;

  return `
    <button class="playlist-tile" data-id="${playlist.id}">
      <div class="playlist-tile-art">${thumb}</div>
      <span class="playlist-tile-title">${escapeHTML(playlist.name)}</span>
    </button>
  `;
}

async function loadPlaylists() {
  const container = document.getElementById('playlistsContainer');
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Loading playlists…</div>`;

  const { data: playlists, error } = await apiCall(ENDPOINTS.playlists());

  if (error) {
    container.innerHTML = errorStateHTML(error);
    return;
  }

  ALL_PLAYLISTS = playlists;

  if (!playlists || playlists.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No playlists found.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="playlist-grid">
      ${playlists.map(p => playlistTileHTML(p)).join('')}
    </div>
  `;

  container.querySelectorAll('.playlist-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      openPlaylistPage(tile.dataset.id);
    });
  });
}

setGreeting();
