/**
 * playbackEngine.js
 * -----------------------------------------------------------------------------
 * A thin abstraction over "however we're actually making sound right now."
 * Nothing else in the app (player.js, playerPage.js) talks to Spotify
 * directly — they only call the 5 methods below. Today the only engine is
 * spotifyEmbedEngine, which wraps Spotify's official iFrame API
 * (https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api).
 *
 * WHY THIS INDIRECTION: if you later add real streamed audio (e.g. your own
 * CDN + an <audio> tag), write a second engine object with the same 5
 * methods and swap `window.playerEngine = spotifyEmbedEngine` for your new
 * one in playerPage.js — player.js and the UI don't change at all.
 *
 * Engine contract (every engine must implement all 5):
 *   mount(container)     - create/attach the actual player into `container`
 *   load(song)            - load a new track (does NOT start playing it)
 *   play() / pause()
 *   onEnded(callback)      - callback() exactly once when the current track finishes
 *   onProgress(callback)    - callback({ position, duration }) periodically (ms)
 *
 * NOTE ON THE VISUAL DESIGN: the Spotify embed itself is kept small and
 * tucked below our own big cover-art/title/controls UI (see playerPage.js
 * and .spotify-engine-frame in style.css) — Spotify is just the "engine",
 * our own UI is the "face" of the player. This is also why swapping engines
 * later won't require any UI rework: the big custom UI never talks to
 * Spotify directly, only to this file's play()/pause()/onEnded().
 * -----------------------------------------------------------------------------
 */

// Spotify's iFrame API loads asynchronously and calls this once, globally,
// whenever it's ready — see the <script src="https://open.spotify.com/embed/iframe-api/v1">
// tag in index.html (loaded AFTER this file on purpose, since this callback
// has to exist before that script can call it).
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  window.SpotifyIFrameAPI = IFrameAPI;
};

function createSpotifyEmbedEngine() {
  let container = null;
  let controller = null;
  let pendingUri = null;
  let endedCallback = null;
  let progressCallback = null;
  let hasFiredEndedForCurrentTrack = false;

  function attachController(EmbedController) {
    controller = EmbedController;
    controller.addListener('playback_update', (e) => {
      const { position, duration, isPaused } = e.data;
      if (progressCallback) progressCallback({ position, duration, isPaused });

      // Spotify's iFrame API has no clean "track ended" event, so we treat
      // "reached the end while playing" as ended. See README Q8 for why
      // this simple position >= duration check is good enough for now.
      if (!isPaused && duration > 0 && position >= duration && !hasFiredEndedForCurrentTrack) {
        hasFiredEndedForCurrentTrack = true;
        if (endedCallback) endedCallback();
      }
    });
  }

  function mountWithApi(attempt) {
    if (!container) return;
    if (window.SpotifyIFrameAPI) {
      window.SpotifyIFrameAPI.createController(container, {
        uri: pendingUri || '',
        width: '100%',
        height: '80',
      }, attachController);
      return;
    }
    // The iFrame API script (loaded in index.html) may not have finished
    // loading yet — retry for a few seconds before giving up.
    if (attempt < 20) {
      setTimeout(() => mountWithApi(attempt + 1), 300);
    }
  }

  return {
    mount(el) {
      container = el;
      mountWithApi(0);
    },
    load(song) {
      hasFiredEndedForCurrentTrack = false;
      const uri = `spotify:track:${song.track_id}`;
      if (controller) {
        controller.loadUri(uri);
      } else {
        pendingUri = uri;
      }
    },
    play() {
      if (controller) controller.play();
    },
    pause() {
      if (controller) controller.pause();
    },
    onEnded(cb) {
      endedCallback = cb;
    },
    onProgress(cb) {
      progressCallback = cb;
    },
  };
}

// The single, app-wide "current engine". Swap this line to change how
// audio actually plays without touching player.js or playerPage.js.
const playerEngine = createSpotifyEmbedEngine();
