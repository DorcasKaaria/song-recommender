/**
 * main.js
 * -----------------------------------------------------------------------------
 * Entry point. This is the LAST script loaded (see index.html), so every
 * function it calls (loadPlaylists, ...) has already been defined by the
 * other js/ files.
 * -----------------------------------------------------------------------------
 */

async function init() {
  await loadPlaylists();
}

init();
