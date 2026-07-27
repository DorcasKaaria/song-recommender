/**
 * player.js
 * -----------------------------------------------------------------------------
 * The one place that knows what's playing, what's next, and how the queue
 * grows and shrinks. The mini player bar, the Player page (playerPage.js),
 * the Playlist page (playlistPage.js), and the Queue page (queuePage.js)
 * never touch playback state directly — they call the functions here and
 * re-render via onPlaybackChange().
 *
 * QUEUE MODEL — additive, not "modes":
 *   `queue` is an array of { song, source } entries. queue[0] is always
 *   "now playing" (or about to play). `source` is just { label: "..." } —
 *   plain display text describing why this song is here, e.g. "Playing
 *   from Playlist: Velocity" or "Playing songs similar to Under the
 *   Influence, Chris Brown" — precomputed by whoever queued it. Both the
 *   Player page and the Queue page read the SAME getCurrentSourceLabel(),
 *   so they can never disagree (see README "Playback").
 *
 *   queueSongs(songs, source) is the ONE function everything goes through
 *   to add songs — clicking a playlist, clicking a search result, and
 *   every "Recommend..." action. It always PREPENDS to the front of the
 *   queue (played first) without clearing what's already there, then
 *   guarantees playback actually starts (see ensurePlaybackStarts()).
 *
 *   Songs are only ever removed from `queue` when they're actually played
 *   through or skipped past (advanceQueue()/jumpToQueueIndex()) — never
 *   just for being replaced by a new queueSongs() call. Removed entries
 *   move to `history`, so playPrevious() has something to go back to.
 *
 * Engine: playback itself goes through playerEngine (playbackEngine.js) —
 * this file never talks to Spotify directly.
 * -----------------------------------------------------------------------------
 */

let queue = [];
let history = [];
const MAX_HISTORY = 20;
let isPaused = true;

function getCurrentEntry() { return queue[0] || null; }
function getCurrentSong() { const e = getCurrentEntry(); return e ? e.song : null; }
function getCurrentSourceLabel() { const e = getCurrentEntry(); return e ? e.source.label : null; }
function getQueue() { return queue; }

const playbackListeners = [];
function onPlaybackChange(cb) { playbackListeners.push(cb); }
function notifyPlaybackChange() { playbackListeners.forEach(cb => cb()); }

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

/** Removes the current head (fully played, or skipped) into history, then
 *  plays whatever's now at the front, if anything. */
function advanceQueue() {
  const finished = queue.shift();
  if (finished) {
    history.push(finished);
    if (history.length > MAX_HISTORY) history.shift();
  }
  if (queue.length > 0) {
    loadAndPlayCurrent();
  } else {
    isPaused = true;
  }
  notifyPlaybackChange();
}

function playNext() { advanceQueue(); }

function playPrevious() {
  const prev = history.pop();
  if (!prev) return;
  queue.unshift(prev);
  loadAndPlayCurrent();
  notifyPlaybackChange();
}

/**
 * Queue page: clicking a song further down the queue skips straight to
 * it — everything before it counts as "skipped" and moves to history,
 * same as playNext() would do one at a time.
 */
function jumpToQueueIndex(i) {
  if (i <= 0 || i >= queue.length) return;
  const skipped = queue.splice(0, i);
  history.push(...skipped);
  while (history.length > MAX_HISTORY) history.shift();
  loadAndPlayCurrent();
  notifyPlaybackChange();
}

/**
 * THE one way anything gets added to the queue — playing a playlist,
 * clicking a search result, or any "Recommend..." action. Always prepends
 * `songs` (tagged with `source`) to the front of the queue; never clears
 * or replaces what's already there. Then guarantees a song is actually
 * playing (see ensurePlaybackStarts()).
 */
function queueSongs(songs, source) {
  if (!songs || songs.length === 0) return;
  queue = [...songs.map(song => ({ song, source })), ...queue];
  notifyPlaybackChange();
  ensurePlaybackStarts();
}

/**
 * The Spotify embed only reliably starts playing once its iframe has
 * actually been rendered on-screen — and #spotifyEngineFrame lives inside
 * the Player page, which is `display:none` whenever it isn't the active
 * page. So every time we queue something new: switch to the Player page
 * (revealing the iframe), nudge it into view so the browser actually
 * renders/plays it, start playback, then scroll back to the top of the
 * page so what the user SEES is our own cover-art/title UI, not the embed.
 */
function ensurePlaybackStarts() {
  goToPage('player');
  const frame = document.getElementById('spotifyEngineFrame');
  const scroller = document.querySelector('.content');
  frame.scrollIntoView({ block: 'nearest' });
  requestAnimationFrame(() => {
    loadAndPlayCurrent();
    scroller.scrollTo({ top: 0 });
  });
}
