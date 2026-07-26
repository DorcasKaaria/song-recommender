/**
 * playerPage.js
 * -----------------------------------------------------------------------------
 * Renders two things from the SAME playback state (player.js), so they can
 * never disagree with each other:
 *   1. The mini player bar — a persistent strip pinned above the bottom nav,
 *      visible on every page once something is playing.
 *   2. The full Player page — big cover art, prev/play-pause/next, and the
 *      Credits list underneath.
 *
 * The three Shuffle buttons and the "Play Recommended" dialog trigger used
 * to live on this page — they've moved to the Queue page (see
 * queuePage.js), since recommendations/shuffling are now a deliberate,
 * queue-focused action rather than something buried under the player.
 *
 * Both re-render every time player.js calls notifyPlaybackChange() (song
 * changed, play/pause toggled, etc) via onPlaybackChange() below — neither
 * one fetches or mutates playback state directly.
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

  document.getElementById('playerCoverArt').src = song.track_image || '';
  document.getElementById('playerTrackTitle').textContent = song.track_name;
  document.getElementById('playerTrackArtist').textContent = song.artists;
  document.getElementById('playerPlayPauseBtn').innerHTML = isPaused ? PLAY_ICON_SVG : PAUSE_ICON_SVG;
  document.getElementById('playerPrevBtn').disabled = queueIndex <= 0;

  renderCredits(song);
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
