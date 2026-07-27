/**
 * playlistPage.js
 * -----------------------------------------------------------------------------
 * The Playlist detail page (Spotify-style): opened by clicking a playlist
 * tile on Home. Shows the playlist's header image/title/description, its
 * full track list from GET /playlists/{id}/songs, and (below the list) a
 * "Recommend Songs similar to ones in this playlist" button.
 *
 * Playing the whole playlist (Play button) or a specific track both go
 * through queueSongs() (player.js) — they ADD to the front of the queue,
 * they don't replace it. Clicking a specific track queues that track
 * onward through the rest of the playlist (so playback continues through
 * it), tagged with source "Playing from Playlist: {name}".
 *
 * IMPORTANT: clicking the recommend button does NOT queue anything by
 * itself — it fetches GET /recommend?playlist_id={currentPlaylistId} (the
 * playlist CURRENTLY OPEN on this page, not necessarily whatever's
 * actually playing) and just shows the results as an interactive list.
 * Each result is only added to the queue if the user taps it (via
 * queueSongs()). Results are cached per playlist id in
 * playlistRecommendCache, so re-opening the same playlist later shows
 * what you already fetched, without re-fetching — only clicking the
 * button again replaces that playlist's cached results.
 *
 * This page is intentionally READ-ONLY otherwise — no editing,
 * reordering, or removing tracks.
 * -----------------------------------------------------------------------------
 */

let currentPlaylistSongs = [];
let currentPlaylistId = null;
let currentPlaylistName = null;

// { [playlistId]: song[] } — recommendations already fetched this
// session, kept until the user clicks the recommend button again for
// that specific playlist.
const playlistRecommendCache = {};

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
      const source = { label: `Playing from Playlist: ${currentPlaylistName}` };
      queueSongs(currentPlaylistSongs.slice(index), source);
    });
  });
}

/**
 * One recommended song row — a plain track-row plus a "+" to make it
 * obvious it adds to the queue rather than plays a whole list. Tapping
 * anywhere on the row queues just that one song.
 */
function recommendRowHTML(song) {
  const thumb = song.track_image
    ? `<img src="${escapeHTML(song.track_image)}" alt="" loading="lazy">`
    : `<div class="search-row-fallback">🎵</div>`;

  return `
    <li class="track-row" data-id="${song.track_id}">
      <div class="track-row-art">${thumb}</div>
      <div class="track-row-info">
        <strong>${escapeHTML(song.track_name)}</strong>
        <span>${escapeHTML(song.artists)}</span>
      </div>
    </li>
  `;
}

function renderPlaylistRecommendations(songs) {
  const section = document.getElementById('playlistRecommendSection');
  const list = document.getElementById('playlistRecommendResults');

  if (!songs || songs.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = songs.map(s => recommendRowHTML(s)).join('');
  list.querySelectorAll('.track-row').forEach((row, i) => {
    row.addEventListener('click', () => {
      queueSongs([songs[i]], { label: `Playing songs similar to Playlist: ${currentPlaylistName}` });
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
  document.getElementById('playlistRecommendArt').src = playlist.thumbnail_url || '';

  document.getElementById('playlistTrackList').innerHTML =
    `<div class="loading"><div class="spinner"></div> Loading songs…</div>`;

  // Show whatever was already fetched for THIS playlist, if anything —
  // never auto-fetches on open.
  renderPlaylistRecommendations(playlistRecommendCache[currentPlaylistId]);

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
  queueSongs(currentPlaylistSongs, { label: `Playing from Playlist: ${currentPlaylistName}` });
});

document.getElementById('refreshPlaylistRecommendationsBtn').addEventListener('click', async () => {
  if (!currentPlaylistId) return;
  const playlistId = currentPlaylistId; // captured in case the user navigates away before this resolves

  const section = document.getElementById('playlistRecommendSection');
  section.style.display = 'block';
  document.getElementById('playlistRecommendResults').innerHTML =
    `<div class="loading"><div class="spinner"></div> Finding recommendations…</div>`;

  const { data: songs, error } = await apiCall(ENDPOINTS.recommendByPlaylist(playlistId));

  if (error) {
    document.getElementById('playlistRecommendResults').innerHTML = errorStateHTML(error);
    return;
  }

  playlistRecommendCache[playlistId] = songs || [];

  // Only re-render if the user is still looking at the same playlist —
  // otherwise the cache update above is enough; it'll show next time they
  // open it.
  if (playlistId === currentPlaylistId) {
    renderPlaylistRecommendations(playlistRecommendCache[playlistId]);
  }
});

// Keep the "now playing" highlight in the track list in sync whenever
// playback state changes (song change, a recommend action, etc.) — not
// just at the moment this page was opened.
onPlaybackChange(() => {
  if (currentPlaylistSongs.length > 0) renderPlaylistTrackList();
});
