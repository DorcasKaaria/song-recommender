/**
 * playlistPage.js
 * -----------------------------------------------------------------------------
 * The Playlist detail page (Spotify-style): opened by clicking a playlist
 * tile on Home. Shows the playlist's header image/title/description and
 * its full track list from GET /playlists/{id}/songs — nothing is queued
 * or played until the user explicitly presses Play or clicks a specific
 * track (see playPlaylistFrom() in player.js).
 *
 * This page is intentionally READ-ONLY — no editing, reordering, or
 * removing tracks. It only shows: the header image, title, description,
 * a Play button, and the track list, per spec.
 * -----------------------------------------------------------------------------
 */

let currentPlaylistSongs = [];
let currentPlaylistId = null;
let currentPlaylistName = null;

function trackRowHTML(song, index) {
  const current = getCurrentSong();
  const isPlaying = current && String(current.track_id) === String(song.track_id);
  const thumb = song.track_image
    ? `<img src="${escapeHTML(song.track_image)}" alt="" loading="lazy">`
    : `<div class="search-row-fallback">🎵</div>`;

  return `
    <li class="track-row ${isPlaying ? 'playing' : ''}" data-index="${index}">
      <span class="track-row-number">${isPlaying ? '♪' : index + 1}</span>
      <div class="track-row-art">${thumb}</div>
      <div class="track-row-info">
        <strong>${escapeHTML(song.track_name)}</strong>
        <span>${escapeHTML(song.artists)}</span>
      </div>
      <span class="track-row-duration">${fmtDuration(song.duration_ms)}</span>
    </li>
  `;
}

function renderPlaylistTrackList() {
  const list = document.getElementById('playlistTrackList');
  if (!list || currentPlaylistSongs.length === 0) return;

  list.innerHTML = currentPlaylistSongs.map((s, i) => trackRowHTML(s, i)).join('');
  list.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', () => {
      const index = parseInt(row.dataset.index, 10);
      playPlaylistFrom(currentPlaylistSongs, index, currentPlaylistId, currentPlaylistName);
    });
  });
}

async function openPlaylistPage(playlistId) {
  const playlist = ALL_PLAYLISTS.find(p => String(p.id) === String(playlistId));
  if (!playlist) return;

  currentPlaylistId = playlist.id;
  currentPlaylistName = playlist.name;
  currentPlaylistSongs = [];

  document.getElementById('playlistHeaderArt').src = playlist.thumbnail_url || '';
  document.getElementById('playlistHeaderTitle').textContent = playlist.name;
  document.getElementById('playlistHeaderDescription').textContent = playlist.description || '';
  document.getElementById('playlistHeaderMeta').textContent =
    playlist.track_count !== undefined ? `${playlist.track_count} songs` : '';

  document.getElementById('playlistTrackList').innerHTML =
    `<div class="loading"><div class="spinner"></div> Loading songs…</div>`;

  goToPage('playlist');

  const { data: songs, error } = await apiCall(ENDPOINTS.playlistSongs(playlistId));

  if (error) {
    document.getElementById('playlistTrackList').innerHTML = errorStateHTML(error);
    return;
  }

  currentPlaylistSongs = songs || [];

  if (currentPlaylistSongs.length === 0) {
    document.getElementById('playlistTrackList').innerHTML = `<div class="empty-state"><p>This playlist has no songs.</p></div>`;
    return;
  }

  renderPlaylistTrackList();
}

document.getElementById('playlistBackBtn').addEventListener('click', () => goToPage('home'));

document.getElementById('playlistPlayBtn').addEventListener('click', () => {
  if (currentPlaylistSongs.length === 0) return;
  playPlaylistFrom(currentPlaylistSongs, 0, currentPlaylistId, currentPlaylistName);
});

// Keep the "now playing" highlight in the track list in sync whenever
// playback state changes (song change, a Shuffle button, etc.) — not just
// at the moment this page was opened.
onPlaybackChange(() => {
  if (currentPlaylistSongs.length > 0) renderPlaylistTrackList();
});
