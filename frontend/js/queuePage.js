/**
 * queuePage.js
 * -----------------------------------------------------------------------------
 * The Queue page: a persistent banner describing WHY the current song is
 * queued (same getCurrentSourceLabel() the Player page shows — see
 * player.js — so the two can never disagree), followed by the full list
 * of songs currently in the queue with the currently playing one
 * highlighted. Clicking any song jumps straight to it (skipping past
 * everything before it — see jumpToQueueIndex() in player.js).
 *
 * There's no reshuffle/recommend UI here anymore — all of that now lives
 * on the Player page (recommend based on what's playing) and the Playlist
 * page (recommend based on a playlist). This page is purely "what's in
 * the queue right now, and why."
 * -----------------------------------------------------------------------------
 */

function queueRowHTML(entry, index) {
  const song = entry.song;
  const isCurrent = index === 0;
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
  const q = getQueue();

  banner.textContent = getCurrentSourceLabel() || 'Your queue is empty — play a playlist, or search for a song.';

  if (q.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Your queue is empty.</p></div>`;
    return;
  }

  list.innerHTML = q.map((entry, i) => queueRowHTML(entry, i)).join('');
  list.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', () => {
      jumpToQueueIndex(parseInt(row.dataset.index, 10));
    });
  });
}

onPlaybackChange(renderQueuePage);

// Initial render — reflects whatever playback state exists at page load
// (usually nothing yet).
renderQueuePage();
