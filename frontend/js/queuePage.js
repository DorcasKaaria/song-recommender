/**
 * queuePage.js
 * -----------------------------------------------------------------------------
 * The Queue page: shows
 *   1. A persistent banner describing WHY the queue is what it is —
 *      "Playing songs like X, Y" / "Playing songs similar to Playlist: Z" /
 *      "Playing randomly selected songs" / "Playing from Playlist: Z" —
 *      built by getQueueSourceLabel() in player.js.
 *   2. The three Shuffle buttons + the "Play Recommended" dialog trigger.
 *      These used to live on the Player page — they've moved here so that
 *      changing what's playing next is a deliberate, queue-focused action:
 *      you open the Queue page and switch strategy, rather than it being
 *      buried under playback controls.
 *   3. The full list of songs currently in the queue, with the currently
 *      playing one highlighted. Clicking any song jumps straight to it
 *      (see jumpToQueueIndex() in player.js) — no re-fetch needed, it's
 *      already loaded.
 * -----------------------------------------------------------------------------
 */

function queueRowHTML(song, index) {
  const isCurrent = index === queueIndex;
  const thumb = song.track_image
    ? `<img src="${escapeHTML(song.track_image)}" alt="" loading="lazy">`
    : `<div class="search-row-fallback">🎵</div>`;

  return `
    <li class="track-row ${isCurrent ? 'playing' : ''}" data-index="${index}">
      <span class="track-row-number">${isCurrent ? '♪' : index + 1}</span>
      <div class="track-row-art">${thumb}</div>
      <div class="track-row-info">
        <strong>${escapeHTML(song.track_name)}</strong>
        <span>${escapeHTML(song.artists)}</span>
      </div>
      <span class="track-row-duration">${fmtDuration(song.duration_ms)}</span>
    </li>
  `;
}

function renderQueuePage() {
  const banner = document.getElementById('queueSourceBanner');
  const list = document.getElementById('queueTrackList');
  const label = getQueueSourceLabel();

  banner.textContent = label || 'Nothing queued yet — play a playlist, or search for a song.';

  // "Shuffle Playlist" only makes sense once a playlist has actually been
  // played this session (see README "Session playlist").
  document.getElementById('shufflePlaylistBtn').disabled = !hasSessionPlaylist();

  if (queue.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Your queue is empty.</p></div>`;
    return;
  }

  list.innerHTML = queue.map((s, i) => queueRowHTML(s, i)).join('');
  list.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', () => {
      jumpToQueueIndex(parseInt(row.dataset.index, 10));
    });
  });
}

document.getElementById('shuffleRandomBtn').addEventListener('click', shuffleRandom);
document.getElementById('shufflePlaylistBtn').addEventListener('click', shufflePlaylist);
document.getElementById('shuffleRecommendedBtn').addEventListener('click', shuffleRecommended);

onPlaybackChange(renderQueuePage);

// Initial render — reflects whatever playback state exists at page load
// (usually nothing yet).
renderQueuePage();
