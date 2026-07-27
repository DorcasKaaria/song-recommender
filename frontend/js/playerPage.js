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
 * the two result sets into one batch, and queues them together via
 * queueSongs() (player.js) — one click, one combined recommendation.
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
}

/**
 * Fires GET /recommend?track_id= and GET /recommend?artists= in parallel
 * (based on whatever's currently playing), merges both result sets, and
 * queues them together as one batch.
 */
async function runRecommendSimilarSongs() {
  const song = getCurrentSong();
  if (!song) return;

  const [byTrack, byArtists] = await Promise.all([
    apiCall(ENDPOINTS.recommendByTrack(song.track_id)),
    apiCall(ENDPOINTS.recommendByArtists(song.artists)),
  ]);

  // If either call failed, still use whatever the other one returned —
  // only bail out if both failed.
  if (byTrack.error && byArtists.error) {
    showToast(byTrack.error, 'error');
    return;
  }

  const merged = [...(byTrack.data || []), ...(byArtists.data || [])];
  if (merged.length === 0) {
    showToast('No songs found.', 'error');
    return;
  }

  queueSongs(merged, { label: `Playing songs similar to ${song.track_name}, ${song.artists}` });
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
