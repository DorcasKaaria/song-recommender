/**
 * playerPage.js
 * -----------------------------------------------------------------------------
 * Renders two things from the SAME playback state (player.js), so they can
 * never disagree with each other:
 *   1. The mini player bar — a persistent strip pinned above the bottom nav,
 *      visible on every page once something is playing.
 *   2. The full Player page — a small "why is this playing" label, big
 *      cover art, prev/play-pause/next, the Credits list, and (below that)
 *      a single "Recommend Similar Songs" button.
 *
 * "Recommend Similar Songs" is based on whatever is CURRENTLY PLAYING. It
 * calls BOTH GET /recommend?track_id= (songs like this exact track) and
 * GET /recommend?artists= (songs by similar artists) in parallel, merges
 * the two result sets, and shows them as an interactive list right below
 * the button — same pattern as the Playlist page's recommend button
 * (see playlistPage.js). Nothing gets queued just from fetching; tapping
 * one of the listed songs is what actually calls queueSongs() (player.js).
 *
 * Both re-render every time player.js calls notifyPlaybackChange() (song
 * changed, play/pause toggled, a recommendation got queued, etc) via
 * onPlaybackChange() below — neither one fetches or mutates playback
 * state directly except the three recommend buttons, which call
 * queueSongs() and let the resulting notifyPlaybackChange() re-render
 * everything as usual.
 *
 * The Spotify iFrame embed itself is mounted once into #spotifyEngineFrame
 * (kept small on purpose — see the note in playbackEngine.js) and is never
 * re-created; only playerEngine.load()/play()/pause() are called after that.
 * -----------------------------------------------------------------------------
 */

const PLAY_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;

function renderMiniPlayer() {
  const song = getCurrentSong();
  const bar = document.getElementById('miniPlayer');

  if (!song) {
    bar.classList.remove('show');
    return;
  }

  bar.classList.add('show');
  document.getElementById('miniPlayerArt').src = song.track_image || '';
  document.getElementById('miniPlayerTitle').textContent = song.track_name;
  document.getElementById('miniPlayerArtist').textContent = song.artists;
  document.getElementById('miniPlayerPlayPauseBtn').innerHTML = isPaused ? PLAY_ICON_SVG : PAUSE_ICON_SVG;
}

function renderPlayerPage() {
  const song = getCurrentSong();
  const emptyState = document.getElementById('playerEmptyState');
  const content = document.getElementById('playerContent');

  if (!song) {
    emptyState.style.display = 'flex';
    content.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  content.style.display = 'flex';

  document.getElementById('playerSourceLabel').textContent = getCurrentSourceLabel() || '';
  document.getElementById('playerCoverArt').src = song.track_image || '';
  document.getElementById('playerTrackTitle').textContent = song.track_name;
  document.getElementById('playerTrackArtist').textContent = song.artists;
  document.getElementById('playerPlayPauseBtn').innerHTML = isPaused ? PLAY_ICON_SVG : PAUSE_ICON_SVG;
  document.getElementById('playerPrevBtn').disabled = queue.length <= 1 && history.length === 0;

  renderCredits(song);
  renderRecommendOptions(song);
}

/**
 * FIELD NAME: song.credits, an array of { name, role }. See README "Field
 * names" for the exact shape.
 */
function renderCredits(song) {
  const container = document.getElementById('playerCreditsContainer');
  const credits = song.credits;

  if (!credits || credits.length === 0) {
    container.innerHTML = `<p class="tab-hint">No credits available for this song.</p>`;
    return;
  }

  container.innerHTML = `
    <h3 class="section-title" style="margin:20px 0 12px;">Credits</h3>
    <ul class="credits-list">
      ${credits.map(c => `
        <li class="credits-row">
          <span class="credits-name">${escapeHTML(c.name)}</span>
          <span class="credits-role">${escapeHTML(c.role)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderRecommendOptions(song) {
  // No dedicated artwork endpoint exists for this action, so it reuses
  // the current song's own cover art — same simplification Spotify itself
  // falls back to when it doesn't have bespoke art for a shelf.
  document.getElementById('recommendSimilarSongsArt').src = song.track_image || '';
  // Results are contextual to whatever's playing — clear them out when
  // the song changes rather than leaving stale results on screen.
  document.getElementById('recommendSimilarSongsResults').innerHTML = '';
}

/**
 * One recommended song row — same pattern as playlistPage.js's
 * recommendRowHTML(): a "+" makes it clear tapping the row adds it to the
 * queue, it doesn't play a whole list.
 */
function recommendResultRowHTML(song) {
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
      <span class="track-row-add" title="Add to queue">+</span>
    </li>
  `;
}

/**
 * Fires GET /recommend?track_id= and GET /recommend?artists= in parallel
 * (based on whatever's currently playing), merges both result sets, and
 * shows them as an interactive list below the button. Nothing is queued
 * until the user taps one of the results.
 */
async function runRecommendSimilarSongs() {
  const song = getCurrentSong();
  if (!song) return;

  const results = document.getElementById('recommendSimilarSongsResults');
  results.innerHTML = `<div class="loading"><div class="spinner"></div> Finding recommendations…</div>`;

  const [byTrack, byArtists] = await Promise.all([
    apiCall(ENDPOINTS.recommendByTrack(song.track_id)),
    apiCall(ENDPOINTS.recommendByArtists(song.artists)),
  ]);

  // If both calls failed, show the error; if only one did, still use
  // whatever the other one returned.
  if (byTrack.error && byArtists.error) {
    results.innerHTML = errorStateHTML(byTrack.error);
    return;
  }

  const merged = [...(byTrack.data || []), ...(byArtists.data || [])];
  if (merged.length === 0) {
    results.innerHTML = `<div class="empty-state"><p>No recommendations available.</p></div>`;
    return;
  }

  results.innerHTML = merged.map(s => recommendResultRowHTML(s)).join('');
  results.querySelectorAll('.track-row').forEach((row, i) => {
    row.addEventListener('click', () => {
      queueSongs([merged[i]], { label: `Playing songs similar to ${song.track_name}, ${song.artists}` });
    });
  });
}

/* ---------------- Wiring ---------------- */

document.getElementById('miniPlayer').addEventListener('click', (e) => {
  if (e.target.closest('#miniPlayerPlayPauseBtn')) return; // handled below instead
  goToPage('player');
});
document.getElementById('miniPlayerPlayPauseBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePlayPause();
});

document.getElementById('playerPlayPauseBtn').addEventListener('click', togglePlayPause);
document.getElementById('playerNextBtn').addEventListener('click', playNext);
document.getElementById('playerPrevBtn').addEventListener('click', playPrevious);

document.getElementById('recommendSimilarSongsBtn').addEventListener('click', runRecommendSimilarSongs);

onPlaybackChange(() => {
  renderMiniPlayer();
  renderPlayerPage();
});

// Mount the (small, tucked-away) Spotify engine once. Every song change
// afterwards goes through playerEngine.load(), not a re-mount.
playerEngine.mount(document.getElementById('spotifyEngineFrame'));

// Initial render — nothing is playing yet, so both show their empty states.
renderMiniPlayer();
renderPlayerPage();
