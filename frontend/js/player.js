/**
 * player.js
 * -----------------------------------------------------------------------------
 * The one place that knows what's playing, what's next, and how to refill
 * the queue. The mini player bar, the Player page (playerPage.js), the
 * Playlist page (playlistPage.js), and the Queue page (queuePage.js) never
 * touch playback state directly — they call the functions here and
 * re-render via onPlaybackChange().
 *
 * QUEUE MODES (queueMode): 'random' | 'playlist' | 'recommended'
 *   - random:      refills from GET /songs
 *   - playlist:    refills from GET /playlists/{sessionPlaylistId}/songs —
 *                  the playlist last played (from the Playlist page). The
 *                  "Shuffle Playlist" button (on the Queue page) is
 *                  disabled until one has been played this session.
 *   - recommended: refills from GET /recommend?track_id={id} OR
 *                  GET /recommend?playlist_id={id} (mutually exclusive —
 *                  never both) depending on whether the user picked a
 *                  song or a playlist in the "Play Recommended" dialog
 *                  (see the bottom of this file). The dialog opens every
 *                  time Shuffle Recommended is pressed, so you can change
 *                  your mind.
 *
 * In every mode, the queue is only refilled once it's actually exhausted
 * (simple "load everything, refill when empty" — see README "Playback").
 *
 * getQueueSourceLabel() builds the persistent banner text shown at the top
 * of the Queue page (e.g. "Playing songs like X, Y") from whichever mode
 * is currently active — see queuePage.js.
 *
 * Engine: playback itself goes through playerEngine (playbackEngine.js) —
 * this file never talks to Spotify directly.
 * -----------------------------------------------------------------------------
 */

let queue = [];
let queueIndex = -1;
let queueMode = null;
let isPaused = true;

// Set once per page load, the moment the user plays a playlist (from the
// Playlist page). Deliberately in-memory only (never persisted) — a fresh
// page load means "Shuffle Playlist" is disabled again until then.
let sessionPlaylistId = null;
let sessionPlaylistName = null;

// Set via the "Play Recommended" dialog — { type: 'track'|'playlist', id, label }
let recommendSource = null;

const playbackListeners = [];
function onPlaybackChange(cb) { playbackListeners.push(cb); }
function notifyPlaybackChange() { playbackListeners.forEach(cb => cb()); }

function getCurrentSong() { return queueIndex >= 0 ? queue[queueIndex] : null; }
function hasSessionPlaylist() { return sessionPlaylistId !== null; }
function getQueue() { return queue; }
function getQueueIndex() { return queueIndex; }

/**
 * Builds the Queue page's persistent "what am I playing" banner text from
 * whichever mode is currently active. Returns null if nothing has ever
 * played yet (queueMode is still unset).
 */
function getQueueSourceLabel() {
  if (queueMode === 'random') return 'Playing randomly selected songs';
  if (queueMode === 'playlist') {
    return sessionPlaylistName ? `Playing from Playlist: ${sessionPlaylistName}` : 'Playing from a playlist';
  }
  if (queueMode === 'recommended' && recommendSource) {
    return recommendSource.type === 'track'
      ? `Playing songs like ${recommendSource.label}`
      : `Playing songs similar to Playlist: ${recommendSource.label}`;
  }
  return null;
}

playerEngine.onEnded(() => playNext());
playerEngine.onProgress(({ isPaused: paused }) => {
  if (paused !== isPaused) {
    isPaused = paused;
    notifyPlaybackChange();
  }
});

function loadAndPlayCurrent() {
  const song = getCurrentSong();
  if (!song) return;
  playerEngine.load(song);
  playerEngine.play();
  isPaused = false;
}

function togglePlayPause() {
  if (!getCurrentSong()) return;
  if (isPaused) playerEngine.play(); else playerEngine.pause();
  isPaused = !isPaused; // optimistic; playerEngine.onProgress corrects this if wrong
  notifyPlaybackChange();
}

function playNext() {
  if (queueIndex < queue.length - 1) {
    queueIndex++;
    loadAndPlayCurrent();
    notifyPlaybackChange();
  } else {
    refillQueue();
  }
}

function playPrevious() {
  if (queueIndex > 0) {
    queueIndex--;
    loadAndPlayCurrent();
    notifyPlaybackChange();
  }
}

/**
 * Queue page: clicking a specific song in the queue jumps straight to it
 * (no re-fetch — it's already in `queue`).
 */
function jumpToQueueIndex(i) {
  if (i < 0 || i >= queue.length) return;
  queueIndex = i;
  loadAndPlayCurrent();
  notifyPlaybackChange();
}

/**
 * Playlist page: called by the "Play" button (startIndex 0) and by
 * clicking a specific track in the list (startIndex = that track's
 * position) — plays the WHOLE playlist as the queue, starting at
 * startIndex, and remembers it as this session's playlist for the
 * "Shuffle Playlist" button. `songs` is whatever the Playlist page already
 * fetched from GET /playlists/{id}/songs — no extra request here.
 */
function playPlaylistFrom(songs, startIndex, playlistId, playlistName) {
  if (!songs || songs.length === 0) return;
  sessionPlaylistId = playlistId;
  sessionPlaylistName = playlistName;
  queue = songs;
  queueIndex = Math.min(Math.max(startIndex, 0), songs.length - 1);
  queueMode = 'playlist';
  loadAndPlayCurrent();
  showToast(`Playing "${playlistName}"`);
  notifyPlaybackChange();
}

/** Search: clicking a result queues it right after the current song AND
 *  plays it immediately (per spec: "Queue and Play"). */
function enqueueNextAndPlay(song) {
  if (queueIndex < 0) {
    queue = [song];
    queueIndex = 0;
    queueMode = queueMode || 'random';
  } else {
    queue.splice(queueIndex + 1, 0, song);
    queueIndex++;
  }
  loadAndPlayCurrent();
  notifyPlaybackChange();
}

/** Called when the queue runs out during normal playback, and also right
 *  after any reshuffle button — always re-fetches from whatever
 *  `queueMode` currently points at. */
async function refillQueue() {
  let result;
  if (queueMode === 'random') {
    result = await apiCall(ENDPOINTS.songs());
  } else if (queueMode === 'playlist') {
    if (!sessionPlaylistId) {
      showToast('Play a playlist first.', 'error');
      return;
    }
    result = await apiCall(ENDPOINTS.playlistSongs(sessionPlaylistId));
  } else if (queueMode === 'recommended') {
    if (!recommendSource) {
      showToast('Choose what to base recommendations on first.', 'error');
      return;
    }
    // Mutually exclusive: exactly one of track_id / playlist_id is sent.
    result = recommendSource.type === 'track'
      ? await apiCall(ENDPOINTS.recommendByTrack(recommendSource.id))
      : await apiCall(ENDPOINTS.recommendByPlaylist(recommendSource.id));
  } else {
    return; // nothing has ever played yet — nothing to refill
  }

  const { data: songs, error } = result;
  if (error || !songs || songs.length === 0) {
    showToast(error || 'No more songs to play.', 'error');
    return;
  }
  queue = songs;
  queueIndex = 0;
  loadAndPlayCurrent();
  notifyPlaybackChange();
}

/* =============================================================================
   Reshuffle — the three visual buttons on the Queue page
   ============================================================================= */

async function shuffleRandom() {
  queueMode = 'random';
  showToast('Playing randomly selected songs', 'success', 5000);
  await refillQueue();
}

async function shufflePlaylist() {
  if (!sessionPlaylistId) return; // button is disabled in this case; safety net
  queueMode = 'playlist';
  showToast('Playing from your selected playlist', 'success', 5000);
  await refillQueue();
}

function shuffleRecommended() {
  openRecommendDialog();
}

async function applyRecommendSource(type, id, label) {
  recommendSource = { type, id, label };
  queueMode = 'recommended';
  showToast(
    type === 'track' ? `Playing songs like ${label}` : `Playing songs similar to Playlist: ${label}`,
    'success', 5000
  );
  await refillQueue();
}

/* =============================================================================
   "Play Recommended" dialog — lets the user choose a song or a playlist to
   base recommendations on. Opens fresh every time so they can change their
   mind (see header comment above). Opened from the Queue page.
   ============================================================================= */

function openRecommendDialog() {
  document.getElementById('recommendSongSearch').value = '';
  document.getElementById('recommendSongResults').innerHTML = '';
  renderRecommendPlaylistList();
  document.getElementById('recommendDialogOverlay').classList.add('open');
}

function closeRecommendDialog() {
  document.getElementById('recommendDialogOverlay').classList.remove('open');
}

function renderRecommendPlaylistList() {
  const container = document.getElementById('recommendPlaylistResults');
  const playlists = (typeof ALL_PLAYLISTS !== 'undefined' && ALL_PLAYLISTS) ? ALL_PLAYLISTS : [];

  if (playlists.length === 0) {
    container.innerHTML = `<p class="tab-hint">Visit Home first to load your playlists.</p>`;
    return;
  }

  container.innerHTML = `
    <ul class="rec-list">
      ${playlists.map(p => `
        <li class="rec-list-item" data-id="${p.id}">
          <div class="rec-list-info"><strong>${escapeHTML(p.name)}</strong></div>
        </li>
      `).join('')}
    </ul>
  `;
  container.querySelectorAll('.rec-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const playlist = playlists.find(p => String(p.id) === item.dataset.id);
      closeRecommendDialog();
      applyRecommendSource('playlist', playlist.id, playlist.name);
    });
  });
}

let recommendSearchDebounce;
document.getElementById('recommendSongSearch').addEventListener('input', (e) => {
  clearTimeout(recommendSearchDebounce);
  const query = e.target.value;
  const resultsDiv = document.getElementById('recommendSongResults');

  if (!query.trim()) {
    resultsDiv.innerHTML = '';
    return;
  }
  resultsDiv.innerHTML = `<div class="loading"><div class="spinner"></div> Searching…</div>`;

  recommendSearchDebounce = setTimeout(async () => {
    const { data: results, error } = await apiCall(ENDPOINTS.search(query));

    if (error) {
      resultsDiv.innerHTML = errorStateHTML(error);
      return;
    }
    if (!results || results.length === 0) {
      resultsDiv.innerHTML = `<p class="tab-hint">No songs found.</p>`;
      return;
    }

    const shown = results.slice(0, 8);
    resultsDiv.innerHTML = `
      <ul class="rec-list">
        ${shown.map(s => `
          <li class="rec-list-item" data-id="${s.track_id}">
            <div class="rec-list-info">
              <strong>${escapeHTML(s.track_name)}</strong>
              <span>${escapeHTML(s.artists)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
    resultsDiv.querySelectorAll('.rec-list-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        const song = shown[i];
        closeRecommendDialog();
        applyRecommendSource('track', song.track_id, `${song.track_name}, ${song.artists}`);
      });
    });
  }, 350);
});

document.getElementById('recommendDialogClose').addEventListener('click', closeRecommendDialog);
document.getElementById('recommendDialogOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'recommendDialogOverlay') closeRecommendDialog();
});
