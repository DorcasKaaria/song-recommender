# Soundwave — Frontend

This is the web UI for the Soundwave music app. It's plain **HTML + CSS +
JavaScript** — no frameworks, no build tools, no `npm install`. If you can
open a file in a browser, you can run this.

It's built to plug into a data-science backend (a recommender, a playlist
store, etc.) over a simple REST API, and to actually **play music** —
Home, Search, and a full Player page with a persistent queue, autoplay,
and three "shuffle" modes. If a request fails for any reason, the page
shows exactly which endpoint failed and why — e.g.
**`/recommend?track_id=abc123 returned 404: Not Found`** — in red, instead
of guessing or making up data. A live status dot in the sidebar also tells
you at a glance whether the backend is currently reachable.

## Why plain HTML/CSS/JS?

As a data science student, you probably don't want to learn React, Vue,
Webpack, npm, etc. just to put a UI in front of your model. A single
`index.html` you can double-click to open (or serve with one command) is
the smallest possible setup that still lets you organize your code well.
When your project grows, you can always migrate to a framework later —
nothing here locks you in.

## Folder structure

```
frontend/
├── index.html              <- The one and only HTML page (a "single-page app")
├── README.md                <- You are here
├── .gitignore                <- Keeps your local env.js out of git
├── css/
│   └── style.css            <- ALL visual styling (colors, spacing, layout)
└── js/
    ├── env.example.js       <- Template for environment config (commit this)
    ├── env.js               <- YOUR local config (never committed, see below)
    ├── config.js            <- Builds API URLs from env.js
    ├── utils.js               <- Shared helpers: apiCall() (fetch + retry), toast, formatting
    ├── apiStatus.js             <- Live "is the backend up?" status dot in the sidebar
    ├── featureForm.js            <- Shared "audio feature sliders" component (Add Song page)
    ├── playbackEngine.js        <- Wraps the Spotify iFrame API behind a small, swappable interface
    ├── navigation.js              <- Switches between pages (sidebar + mobile bottom nav)
    ├── home.js                     <- Home page (playlist grid)
    ├── search.js                    <- Search page
    ├── player.js                     <- Playback state: queue, current song, the 3 shuffle modes
    ├── playerPage.js                  <- Renders the mini player bar + the full Player page from player.js's state
    ├── addSong.js                      <- Add Song page
    └── main.js                          <- Starts the app (runs last)
```

### How the pieces map to what you see on screen

| File              | Page / component it powers                          | Backend route(s) it calls        |
|-------------------|-------------------------------------------------------|----------------------------------|
| `home.js`         | "Home" — grid of playlists                            | `GET /playlists`                 |
| `search.js`       | "Search" — search by title/artist, click a result to queue + play it | `GET /songs/search`   |
| `player.js`       | Playback state + the 3 Shuffle buttons + the "Play Recommended" dialog | `GET /songs`, `GET /playlists/{playlist_id}/songs`, `GET /recommend?track_id={id}`, `GET /recommend?playlist_id={id}` |
| `playerPage.js`   | Renders the mini player bar (all pages) and the full "Player" page (cover art, controls, credits) from `player.js`'s state | — (no route, pure rendering) |
| `playbackEngine.js` | The actual Spotify iFrame embed, wrapped so it can be swapped for real streamed audio later | — (talks to Spotify's embed, not our backend) |
| `addSong.js`      | "Add Song" — form to add a new song                    | `POST /songs`                    |
| `featureForm.js`  | The 12-slider "audio features" form used by Add Song   | — (no route, just UI)            |
| `navigation.js`   | Sidebar (desktop) + bottom nav bar (mobile) that switch pages | — (no route)               |
| `apiStatus.js`    | Live red/green backend status dot in the sidebar       | `GET /songs` (used as a lightweight ping) |
| `utils.js`        | `apiCall()` (fetch + retry wrapper), `showToast()`, error message, formatting | — (shared plumbing) |
| `config.js` / `env.js` | Where the backend URL is configured               | — (configuration only)          |

There's no framework and no bundler, so every `.js` file above is loaded
directly by `<script>` tags in `index.html`, in a specific order (see
"Load order" below). Every function ends up as a plain global function —
that's normal and fine at this scale. It's the simplest mental model:
**one file, one job**.

## Running it locally

You don't need Node.js, npm, or any install step to view the UI. Any of
these work:

1. **Just open the file** — double-click `index.html`, or drag it into your
   browser. (Some browsers restrict `fetch` on `file://` pages — if a page
   shows a red "returned ..." error right away, use option 2 instead.)
2. **Serve it with Python** (already on most data-science machines):
   ```bash
   cd frontend
   python3 -m http.server 5500
   ```
   Then open `http://localhost:5500` in your browser.
3. **VS Code "Live Server" extension** — right-click `index.html` → "Open
   with Live Server".

You'll also need your backend running (see your backend project's own
README) — this frontend has nothing to show without it.

## Connecting to the backend

1. Copy the template file:
   ```bash
   cp js/env.example.js js/env.js
   ```
   (A working `js/env.js` is already included so the app runs immediately —
   you only need to do this if you ever delete it.)
2. Open `js/env.js` and set `API_BASE` to wherever your backend runs, e.g.:
   ```js
   window.APP_CONFIG = {
     API_BASE: "http://127.0.0.1:8000",   // FastAPI/Flask running locally
   };
   ```
3. When you deploy (e.g. your backend moves to a real server), change
   `API_BASE` to that server's URL — that's the **only** file you need to
   touch to point the whole app at a different backend.

`js/env.js` is listed in `.gitignore` on purpose: it's a per-environment
setting, not code, so it shouldn't be committed. `js/env.example.js` is the
template that *is* committed, so anyone cloning the project knows what to
copy and fill in.

## Home — playlists

`GET /playlists` returns an array of playlist objects (see "Field names"
below). Home shows them as a Spotify-style grid of tiles. Clicking a tile:
1. Fetches `GET /playlists/{playlist_id}/songs` and starts playing that
   list (queue mode `'playlist'`).
2. Remembers that playlist's id as `sessionPlaylistId` in `player.js` —
   **in memory only**, never persisted. A page reload clears it. This is
   what the "Shuffle Playlist" button on the Player page uses; it stays
   disabled until you've opened at least one playlist this session.

## Playback: the queue, the mini player, and the Player page

Everything about "what's playing" lives in one place: `player.js`. It
holds the queue (an array of songs), the current position in it, and
which of the three modes (below) it was last filled from. Two things
render from that same state and never disagree with each other:

- **The mini player bar** (`js/playerPage.js` → `renderMiniPlayer()`) —
  a slim strip showing the current song's art/title/artist and a
  play/pause button, visible on every page once something is playing.
  Click it (anywhere except the play/pause button) to jump to the full
  Player page.
- **The full Player page** (`renderPlayerPage()`) — big cover art
  (`track_image`), title/artist, previous/play-pause/next, the three
  Shuffle buttons, and the Credits list underneath.

### Autoplay and auto-advance

The next song plays automatically once the current one ends. Spotify's
iFrame API doesn't have a clean "track ended" event, so `playbackEngine.js`
treats `position >= duration` (from the API's `playback_update` event) as
"ended" and calls `playNext()`. This is a simple heuristic, not a perfect
one — fine for now, flagged here in case you want to make it more robust
later (e.g. requiring `isPaused` to also flip, or a small buffer).

### The three Shuffle modes

| Button | Refills the queue from | Notes |
|---|---|---|
| **Shuffle Random** | `GET /songs` | Always available. Shows "Playing randomly selected songs" for 5 seconds. |
| **Shuffle Playlist** | `GET /playlists/{sessionPlaylistId}/songs` | Disabled until you've opened a playlist from Home this session (see above). |
| **Shuffle Recommended** | `GET /recommend?track_id={id}` **or** `GET /recommend?playlist_id={id}` | Opens the "Play Recommended" dialog every time (see below) — never both query params in the same request. |

**Refill timing (all three modes):** the queue is only refilled once it's
actually exhausted (you've played through everything in it) — not on a
fixed count. This applies uniformly to Random, Playlist, and Recommended;
none of them refill early. When a refill does happen, it always re-runs
whatever `queueMode` is currently set to.

### The "Play Recommended" dialog

Recommendations can be based on either **a single song** or **an entire
playlist** — there's no way to know which one you want, so pressing
Shuffle Recommended always opens a small dialog first:
- **Search a song** — a debounced search box hitting `GET /songs/search`;
  click a result to base recommendations on that track
  (`GET /recommend?track_id={track_id}`).
- **Or choose a playlist** — lists whatever `GET /playlists` already
  returned on Home (`ALL_PLAYLISTS` in `home.js`, reused here without a
  second fetch); click one to base recommendations on that playlist
  (`GET /recommend?playlist_id={playlist_id}`).

Whichever you pick is remembered as `recommendSource` in `player.js` (an
in-memory `{ type: 'track' | 'playlist', id, label }`) so later refills of
Recommended mode keep using it — until you press Shuffle Recommended again
and pick something else.

### Search — click to queue and play

Clicking a search result inserts it **immediately after the current song**
and starts playing it right away (not just appended silently to the end of
the queue) — see `enqueueNextAndPlay()` in `player.js`.

### Embedding the Spotify player — and leaving room for real audio later

`playbackEngine.js` is a thin, swappable layer: `player.js` and
`playerPage.js` only ever call 5 generic methods (`mount`, `load`,
`play`, `pause`, `onEnded`/`onProgress`) — **nothing else in the app talks
to Spotify directly**. Today the only implementation is
`createSpotifyEmbedEngine()`, which wraps
[Spotify's official iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api).

The actual `<iframe>` is mounted **once**, kept small, and tucked below
our own big cover-art/title/controls UI (`.spotify-engine-frame` in
`style.css`) — visually, Spotify is just the "engine"; our own UI is the
"face" of the player. It's mounted inside the Player page's markup, but
because `navigation.js` only ever toggles pages with a CSS class (never
removes them from the DOM), switching to Home or Search does **not**
unmount or reload the iframe — it keeps playing in the background exactly
like Spotify's own app does.

If you ever add real streamed audio (your own CDN + an `<audio>` tag),
write a second engine object implementing the same 5 methods and swap
`const playerEngine = createSpotifyEmbedEngine();` for your new one at the
bottom of `playbackEngine.js` — `player.js`, `playerPage.js`, and all the
UI stay exactly as they are.

## Search

`GET /songs/search?q=<query>` (debounced as you type). Results are
clickable rows — see "Search — click to queue and play" above.

## Mobile navigation

Below 800px wide, the desktop sidebar is hidden and replaced by a bottom
tab bar (Home / Search / Player / Add), the same pattern Spotify's own
mobile app uses. It's plain markup reusing the exact same
`.nav-item[data-page="..."]` buttons as the sidebar, so `navigation.js`
wires it up automatically with zero extra JavaScript — see `.mobile-nav`
in `index.html` and `style.css`. Without this, there was previously no way
to navigate at all once the sidebar disappeared on a small screen.

## Retrying failed requests

Some endpoints — recommendations especially — can be slow or briefly
flaky. Instead of failing on the very first hiccup, `apiCall()` in
`utils.js` retries automatically:
- Each individual attempt gets its own **2.5s** timeout.
- Between attempts there's a short **400ms** pause.
- Only after **6.7 seconds total** have passed does it give up and report
  an error.
- A `5xx` server error is retried (it might genuinely be transient); a
  `4xx` client error is **not** retried (retrying the identical bad
  request won't fix it) — that one fails immediately.

This applies to every request that goes through `apiCall()` — which is
all of them, across every page — so you don't need to think about
retries anywhere else in the codebase.

## When something goes wrong

If a request ultimately fails (after the retries above are exhausted, or
immediately for a non-retryable error), the page shows the **specific
endpoint and status** in red instead of a vague message, e.g.:

```
/recommend?track_id=a1b2c3 returned 404: Not Found
```

(or, if the backend never responded at all, something like
`/songs failed: Network error`). This shows up inline in red text where
the failed data would have gone, or as a toast for button actions like
Add Song. `apiCall()` builds this message and returns it as `error`; every
page checks `error` and passes it straight to `errorStateHTML(error)` or
`showToast(error, 'error')` rather than inventing its own wording.

The sidebar's **API Status** indicator (`js/apiStatus.js`) gives you an
at-a-glance signal without opening the console: a green dot + "API Active"
means the last check succeeded, a red dot + "API Offline / Unreachable"
means it didn't. It re-checks automatically every 30 seconds, using
`apiCall()` like every other request — so it gets the same retries before
flipping to "Offline," rather than reacting to one brief hiccup.

## Theme & branding

The color scheme is blue-based (`--accent: #1d78e2` in `css/style.css`),
not Spotify green — change that one variable (and `--accent-hover` right
below it) to re-theme the whole app, since everything else references it.

The logo/favicon is an original three-bar "equalizer" mark (not a
Spotify-style icon), defined in two places that need to stay in sync if
you change it:
- `.logo svg` in `index.html` (sidebar)
- the inline `data:image/svg+xml` favicon in `<head>` in `index.html` (browser tab)

## Making changes safely

- **Changing colors/spacing/fonts?** Only edit `css/style.css`. It won't
  break any functionality — it's pure appearance.
- **Backend added a new field, or renamed one?**
  - New/renamed audio feature → edit `FEATURE_DEFS` in `js/featureForm.js`.
  - New/renamed/removed route → edit `js/config.js` (`ENDPOINTS`).
  - New/renamed song or playlist field → see "Field names" below for
    every place to update.
- **Backend endpoint changed shape?** Look at the code that reads the
  response in the matching file: `home.js` for `/playlists`, `player.js`
  for `/songs`, `/playlists/{id}/songs`, and `/recommend`, `search.js` for
  `/songs/search`.
- **Adding a whole new page?** Add a `<section class="page" id="page-yourpage">`
  in `index.html`, a matching button with `data-page="yourpage"` in
  **both** `.sidebar` and `.mobile-nav`, and a new `js/yourpage.js` file —
  then add it to the `<script>` list at the bottom of `index.html`.
- **Adding a 4th Shuffle mode?** Add a button in the `.reshuffle-row` in
  `index.html`, a matching `queueMode` branch in `refillQueue()` in
  `js/player.js`, and a `shuffleYourMode()` function that sets `queueMode`
  and calls `refillQueue()`.

## Load order (why it matters)

Because there's no bundler, the browser loads and runs each `<script>` tag
top-to-bottom, in the order they appear in `index.html`. Files that define
shared things (config, helpers, the playback engine) must load **before**
the files that use them:

```
env.js → config.js → utils.js → apiStatus.js → featureForm.js
→ playbackEngine.js → (Spotify iFrame API, async)
→ navigation.js → home.js → search.js → player.js → playerPage.js
→ addSong.js → main.js  (runs init() last, after everything else is defined)
```

`apiStatus.js` is loaded right after `utils.js` because it calls
`apiCall()` — it shares the same retry/timeout behavior as every other
request in the app (see "Retrying failed requests" below) rather than
doing its own raw `fetch()`.

The Spotify iFrame API `<script>` tag (loaded from `open.spotify.com`) is
placed right after `playbackEngine.js` on purpose: `playbackEngine.js`
defines `window.onSpotifyIframeApiReady`, which that script calls once
it's finished loading — that function has to exist first.

`player.js` is loaded before `playerPage.js` because `playerPage.js` reads
playback state (`getCurrentSong()`, `queueIndex`, etc.) directly; `home.js`
is loaded before `player.js`'s "Play Recommended" dialog code runs (at the
bottom of `player.js`) because that dialog reads `ALL_PLAYLISTS` from
`home.js`.

If you add a new shared helper, put its `<script>` tag before the pages
that use it. If you're not sure, the safest place for a new *shared* file
is right after `utils.js`; the safest place for a new *page* file is right
before `main.js`.

## Field names — matching the real backend

### Playlists (`GET /playlists`)

```json
[
  {
    "id": "6f38BFklpsOzNpfux87O5y",
    "name": "Sentient",
    "description": "",
    "followers": 2,
    "public": true,
    "collaborative": false,
    "thumbnail_url": "https://mosaic.scdn.co",
    "track_count": 200
  }
]
```

| Field | Meaning |
|---|---|
| `id` | Used for `GET /playlists/{id}/songs`, `GET /recommend?playlist_id={id}`, and `sessionPlaylistId` |
| `name` | Shown on the playlist tile |
| `thumbnail_url` | Shown on the playlist tile (falls back to a music-note icon if empty) |
| `description`, `followers`, `public`, `collaborative`, `track_count` | Returned but not currently displayed anywhere — available if you want to show them later |

### Songs

Every song object that flows through the app (from `/playlists/{id}/songs`,
`/songs/search`, `/songs`, and `/recommend`) uses the **same field names**:

```
track_id, artists, album_name, track_name, popularity, duration_ms,
explicit, danceability, energy, key, loudness, mode, speechiness,
acousticness, instrumentalness, liveness, valence, tempo, time_signature,
track_genre, track_youtube_link, track_image, credits
```

| Field | Meaning |
|---|---|
| `track_id` | Unique song id — used for queue identity, `spotify:track:{track_id}` (assumes `track_id` doubles as a real Spotify track ID), and `/recommend?track_id=` |
| `track_name` / `artists` / `album_name` / `track_genre` | Displayed throughout |
| `duration_ms` | Duration in **milliseconds** — `fmtDuration()` in `utils.js` expects milliseconds |
| `popularity` | 0–100 popularity score |
| `explicit` | Boolean |
| `track_image` | Cover art URL — shown as the mini player thumbnail, the search result thumbnail, and the full Player page's big cover art |
| `credits` | Array of `{ "name": "...", "role": "..." }`, rendered as a list under the Player page's controls (`renderCredits()` in `playerPage.js`). Example: `[{ "name": "Zella Day", "role": "Main Artist" }, { "name": "Nick Bailey", "role": "Composer, Lyricist" }]` |
| `track_youtube_link` | Not currently used anywhere in the UI (left over from a previous design) — safe to ignore or repurpose |
| 12 audio features | `danceability`, `energy`, `key`, `loudness`, `mode`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `tempo`, `time_signature` — flat, top-level fields directly on the song object, same as `track_name` (see `FEATURE_DEFS` in `featureForm.js`). **There is no nested `features` object.** |

**If your backend's song or playlist shape ever changes** (renamed/added/
removed field), update it in all of these places together:
- `home.js` (`playlistTileHTML`) — playlist field names
- `player.js` (`playPlaylist`, `renderRecommendPlaylistList`,
  `applyRecommendSource`, the search-result rendering in the recommend dialog)
- `playerPage.js` (`renderMiniPlayer`, `renderPlayerPage`, `renderCredits`)
- `search.js` (`searchResultRowHTML`)
- `featureForm.js` (`FEATURE_DEFS`)
- `addSong.js` (the `payload` object sent to `POST /songs`)

## Add Song page — no release year

The "Add Song" form does **not** collect a release year. Songs added
through this page are sent with a title, artist, album, genre, duration,
whether it's explicit, and all 12 audio features — matching the real
backend schema field-for-field, with the features sent as flat top-level
values rather than nested under a "features" key.

## Learning more (beginner-friendly resources)

If you're new to web frontend basics, these are solid, widely-used, free
references:

- **HTML**
  - [W3Schools HTML Tutorial](https://www.w3schools.com/html/)
  - [MDN: HTML basics](https://developer.mozilla.org/en-US/docs/Learn/HTML)
- **CSS**
  - [W3Schools CSS Tutorial](https://www.w3schools.com/css/)
  - [MDN: CSS basics](https://developer.mozilla.org/en-US/docs/Learn/CSS)
  - [CSS Variables (custom properties)](https://www.w3schools.com/css/css3_variables.asp) — used throughout `style.css`
  - [MDN: Media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) — how the mobile bottom nav / sidebar swap happens
- **JavaScript**
  - [W3Schools JavaScript Tutorial](https://www.w3schools.com/js/)
  - [MDN: JavaScript basics](https://developer.mozilla.org/en-US/docs/Learn/JavaScript)
  - [MDN: `fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) — how `apiCall()` in `utils.js` talks to the backend
  - [MDN: `async`/`await`](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) — used everywhere the app waits on the backend
- **Spotify iFrame API** (used by `playbackEngine.js`)
  - [Official tutorial](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api)

You don't need to read all of these front-to-back. Skim the HTML and CSS
tutorials for the tags/properties you don't recognize in `index.html` /
`style.css`, and focus your JS learning on `fetch`, `async`/`await`, and
DOM basics (`document.getElementById`, `addEventListener`) — that covers
essentially everything this codebase does.
