# Soundwave — Frontend

This is the web UI for the Soundwave music app. It's plain **HTML + CSS +
JavaScript** — no frameworks, no build tools, no `npm install`. If you can
open a file in a browser, you can run this.

It's built to plug into a data-science backend (a recommender, a playlist
store, etc.) over a simple REST API, and to actually **play music** —
Home, Search, a Playlist detail page, a full Player page, and a Queue
page, with a persistent, ever-growing queue and autoplay. If a request
fails for any reason, the page shows exactly which endpoint failed and
why — e.g. **`/recommend?track_id=abc123 returned 404: Not Found`** — in
red, instead of guessing or making up data. A live status dot in the
sidebar also tells you at a glance whether the backend is currently
reachable.

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
    ├── playbackEngine.js          <- Wraps the Spotify iFrame API behind a small, swappable interface
    ├── navigation.js                <- Switches between pages (sidebar + mobile bottom nav)
    ├── home.js                       <- Home page (playlist grid)
    ├── search.js                      <- Search page
    ├── player.js                       <- Playback state: the queue, current song, queueSongs()
    ├── playlistPage.js                  <- Playlist detail page (read-only track list + recommend button)
    ├── queuePage.js                      <- Queue page (what's queued, and why)
    ├── playerPage.js                      <- Mini player bar + full Player page, both rendered from player.js's state
    └── main.js                              <- Starts the app (runs last)
```

### How the pieces map to what you see on screen

| File              | Page / component it powers                          | Backend route(s) it calls        |
|-------------------|-------------------------------------------------------|----------------------------------|
| `home.js`         | "Home" — grid of playlists                            | `GET /playlists`                 |
| `search.js`       | "Search" — search by title/artist, click a result to queue + play it | `GET /songs/search`   |
| `playlistPage.js` | Playlist detail page — track list + "Recommend Songs similar to ones in this playlist" | `GET /playlists/{id}/songs`, `GET /recommend?playlist_id={id}` |
| `player.js`       | Playback state — the queue, current song, `queueSongs()` (the one way anything gets queued) | — (no route of its own; called by the pages above) |
| `playerPage.js`   | Mini player bar (all pages) + the full "Player" page (cover art, controls, credits, "Recommend Similar Songs") | `GET /recommend?track_id={id}`, `GET /recommend?artists={artists}` |
| `queuePage.js`    | "Queue" page — the persistent "why is this playing" banner + the full queue list | — (no route, reads player.js's state) |
| `playbackEngine.js` | The actual Spotify iFrame embed, wrapped so it can be swapped for real streamed audio later | — (talks to Spotify's embed, not our backend) |
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
below). Home shows them as a Spotify-style grid of tiles. Clicking a tile
does **not** start playing anything — it opens the Playlist page (below)
so you can see the full track list first.

## The Playlist page

Opened by clicking a playlist tile. Read-only — no editing, reordering,
or removing tracks. Shows:
- The header image, title, description, and track count from the
  playlist object Home already fetched (no second request for these).
- The full track list from `GET /playlists/{id}/songs`.
- A **Play** button (plays the whole playlist from the start).
- A **"Recommend Songs similar to ones in this playlist"** button (see
  below).

Pressing **Play**, or clicking a specific track, both call `queueSongs()`
(see "Playback" below) — clicking a specific track queues that track
onward through the rest of the playlist, so playback continues through it
afterwards.

### Recommending from a playlist

The recommend button is intentionally **not** the same as Play — clicking
it does **not** queue or play anything by itself. It:
1. Calls `GET /recommend?playlist_id={id}` for whichever playlist is
   **currently open on this page** (not necessarily whatever's actually
   playing in the queue right now).
2. Shows the results as an interactive list right under the track list,
   titled "Recommended Songs" — tapping any one of them is what actually
   queues it (via `queueSongs()`).

Results are cached per playlist id in `playlistRecommendCache` (an
in-memory object in `playlistPage.js`) until you click the button again
for that playlist — so navigating away and back to the same playlist
shows what you already fetched, without re-fetching.

## Playback: the queue, the mini player, and the Player/Queue pages

Everything about "what's playing" lives in one place: `player.js`.

### The queue model — additive, not "modes"

`queue` is an array of `{ song, source }` entries. `queue[0]` is always
"now playing" (or about to play). `source` is just `{ label: "..." }` —
plain display text describing *why* this song is queued, e.g. `"Playing
from Playlist: Velocity"` or `"Playing songs similar to Under the
Influence, Chris Brown"` — precomputed by whoever queued it.

**`queueSongs(songs, source)` is the one function everything goes
through** to add songs to the queue: playing a playlist, clicking a
search result, and every "Recommend..." action. It always **prepends** to
the front of the queue (so the newest addition plays next/first) —
**it never clears or replaces what's already there.** Songs are only
ever removed from the queue when they're actually played through or
skipped past, never just for being "replaced" by a new `queueSongs()`
call. Removed entries move into `history` (capped at 20), so the
Previous button has something to go back to.

Both the Player page and the Queue page read the exact same
`getCurrentSourceLabel()` (which just reads `queue[0].source.label`), so
they can never disagree about "what's playing and why" — see
`onPlaybackChange()` for how both stay in sync with zero duplicated
state.

### The mini player bar and the two pages

- **The mini player bar** (`playerPage.js` → `renderMiniPlayer()`) — a
  slim strip showing the current song's art/title/artist and a play/pause
  button, visible on every page once something is playing. Click it
  (anywhere except the play/pause button) to jump to the full Player page.
- **The Player page** (`renderPlayerPage()`) — the source label (e.g.
  "Playing from Playlist: Velocity") at the top, big cover art
  (`track_image`), title/artist, previous/play-pause/next, the Credits
  list, and the "Recommend Similar Songs" button.
- **The Queue page** (`queuePage.js`) — the same source label as a
  persistent banner, followed by the full list of everything currently
  queued. The current song is highlighted; clicking any other song in the
  list jumps straight to it (everything before it counts as "skipped" and
  moves into `history`, same as playing through them one at a time would).

### Autoplay and auto-advance

The next song plays automatically once the current one ends. Spotify's
iFrame API doesn't have a clean "track ended" event, so `playbackEngine.js`
treats `position >= duration` (from the API's `playback_update` event) as
"ended" and calls `playNext()`. This is a simple heuristic, not a perfect
one — fine for now, flagged here in case you want to make it more robust
later (e.g. requiring `isPaused` to also flip, or a small buffer).

### Guaranteeing a song actually starts playing

The Spotify embed only reliably starts playing once its `<iframe>` has
actually been rendered on-screen at least once — and `#spotifyEngineFrame`
lives inside the Player page, which is `display:none` whenever it isn't
the active page. So every call to `queueSongs()` ends with
`ensurePlaybackStarts()` (in `player.js`), which:
1. Switches to the Player page (revealing the iframe if it wasn't already).
2. Scrolls it into view so the browser actually renders/plays it.
3. Starts playback.
4. Scrolls back to the top of the page, so what you actually **see** is
   the normal cover-art/title UI, not the embed itself.

This means any action that adds to the queue (playing a playlist,
clicking a search result, a recommend action) will always leave you on
the Player page afterwards, by design — that's how it guarantees
something is actually playing rather than silently failing to start.

### Recommend Similar Songs (Player page)

One button, based on whatever is **currently playing**. It fires
`GET /recommend?track_id={id}` and `GET /recommend?artists={artists}` in
parallel, merges both result sets, and queues them together as one batch
(so you don't have to pick between "similar songs" and "similar artists"
— you get both). It's a compact pill button reusing the current song's
own `track_image` for its icon, since there's no dedicated
artwork-per-action endpoint.

### Search — click to queue and play

Clicking a search result calls `queueSongs([song], ...)` — added to the
front of the queue and played immediately (see the queue model above),
not just silently appended to the end.

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
"face" of the player.

If you ever add real streamed audio (your own CDN + an `<audio>` tag),
write a second engine object implementing the same 5 methods and swap
`const playerEngine = createSpotifyEmbedEngine();` for your new one at the
bottom of `playbackEngine.js` — `player.js`, `playerPage.js`, and all the
UI stay exactly as they are.

## Mobile navigation

Below 800px wide, the desktop sidebar is hidden and replaced by a bottom
tab bar (Home / Search / Player / Queue), the same pattern Spotify's own
mobile app uses. It's plain markup reusing the exact same
`.nav-item[data-page="..."]` buttons as the sidebar, so `navigation.js`
wires it up automatically with zero extra JavaScript — see `.mobile-nav`
in `index.html` and `style.css`.

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
the failed data would have gone, or as a toast for button actions.
`apiCall()` builds this message and returns it as `error`; every page
checks `error` and passes it straight to `errorStateHTML(error)` or
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
- **Backend added a new field, or renamed one?** See "Field names" below
  for every place a song/playlist field name shows up.
- **Backend added/renamed/removed a route?** Edit `js/config.js`
  (`ENDPOINTS`) — that's the only place URLs are built.
- **Backend endpoint changed shape?** Look at the code that reads the
  response in the matching file: `home.js` for `/playlists`,
  `playlistPage.js` for `/playlists/{id}/songs` and playlist-based
  `/recommend`, `playerPage.js` for track/artist-based `/recommend`,
  `search.js` for `/songs/search`.
- **Adding a whole new page?** Add a `<section class="page" id="page-yourpage">`
  in `index.html`, a matching button with `data-page="yourpage"` in
  **both** `.sidebar` and `.mobile-nav`, and a new `js/yourpage.js` file —
  then add it to the `<script>` list at the bottom of `index.html`.
- **Adding another way to queue songs?** Call `queueSongs(songs, { label:
  "..." })` — don't build a separate queue-management path; that function
  already handles prepending, playback, and the "guarantee it actually
  starts" logic (see "Playback" above).

## Load order (why it matters)

Because there's no bundler, the browser loads and runs each `<script>` tag
top-to-bottom, in the order they appear in `index.html`. Files that define
shared things (config, helpers, the playback engine) must load **before**
the files that use them:

```
env.js → config.js → utils.js → apiStatus.js → playbackEngine.js
→ (Spotify iFrame API, async) → navigation.js → home.js → search.js
→ player.js → playlistPage.js → queuePage.js → playerPage.js
→ main.js  (runs init() last, after everything else is defined)
```

`apiStatus.js` is loaded right after `utils.js` because it calls
`apiCall()` — it shares the same retry/timeout behavior as every other
request in the app (see "Retrying failed requests" above) rather than
doing its own raw `fetch()`.

The Spotify iFrame API `<script>` tag (loaded from `open.spotify.com`) is
placed right after `playbackEngine.js` on purpose: `playbackEngine.js`
defines `window.onSpotifyIframeApiReady`, which that script calls once
it's finished loading — that function has to exist first.

`player.js` is loaded before `playlistPage.js`, `queuePage.js`, and
`playerPage.js` because all three call playback functions (`queueSongs()`,
`getCurrentSong()`, `onPlaybackChange()`, etc.) at the top level of their
own script, not just inside click handlers — those functions have to
already exist when that code runs.

If you add a new shared helper, put its `<script>` tag before the pages
that use it. If you're not sure, the safest place for a new *shared* file
is right after `utils.js`; the safest place for a new *page* file is right
before `main.js`.

### Cache-busting — bump this after every deploy

Every local `<script src="js/...">` and the CSS `<link>` end in `?v=1`.
Browsers cache plain script/CSS files aggressively, and with no build
step there's no automatic "this file changed" signal — so after editing
**any** file in `js/` or `css/`, bump that number (e.g. `?v=2`) on **all**
of these tags at once, in one pass. If you only bump some of them, a
visitor's browser can end up running an old cached copy of one file
alongside new copies of the others, which shows up as confusing
`"X is not defined"` errors that have nothing to do with your actual code
— they're just version-mismatched files talking past each other. If you
ever hit that error yourself while developing, a hard refresh
(Ctrl/Cmd+Shift+R, or an incognito window) rules it out immediately.

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
| `id` | Used for `GET /playlists/{id}/songs` and `GET /recommend?playlist_id={id}` |
| `name` | Shown on the playlist tile and the Playlist page header |
| `thumbnail_url` | Shown on the playlist tile, the Playlist page header, and its recommend button (falls back to a music-note icon if empty) |
| `description`, `track_count` | Shown on the Playlist page header |
| `followers`, `public`, `collaborative` | Returned but not currently displayed anywhere — available if you want to show them later |

### Songs

Every song object that flows through the app (from `/playlists/{id}/songs`,
`/songs/search`, and `/recommend`) uses the **same field names**:

```
track_id, artists, album_name, track_name, popularity, duration_ms,
explicit, danceability, energy, key, loudness, mode, speechiness,
acousticness, instrumentalness, liveness, valence, tempo, time_signature,
track_genre, track_youtube_link, track_image, credits
```

| Field | Meaning |
|---|---|
| `track_id` | Unique song id — used for queue identity and `spotify:track:{track_id}` (assumes `track_id` doubles as a real Spotify track ID) |
| `track_name` / `artists` / `album_name` / `track_genre` | Displayed throughout |
| `duration_ms` | Duration in **milliseconds** — `fmtDuration()` in `utils.js` expects milliseconds |
| `popularity` | 0–100 popularity score |
| `explicit` | Boolean |
| `track_image` | Cover art URL — shown as the mini player thumbnail, search/track-list/queue row thumbnails, and the full Player page's big cover art |
| `credits` | Array of `{ "name": "...", "role": "..." }`, rendered as a list under the Player page's controls (`renderCredits()` in `playerPage.js`). Example: `[{ "name": "Zella Day", "role": "Main Artist" }, { "name": "Nick Bailey", "role": "Composer, Lyricist" }]` |
| `track_youtube_link` | Not currently used anywhere in the UI (left over from a previous design) — safe to ignore or repurpose |
| 12 audio features | `danceability`, `energy`, `key`, `loudness`, `mode`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `tempo`, `time_signature` — flat, top-level fields directly on the song object, same as `track_name`. **There is no nested `features` object.** Not currently read by the frontend (no feature-editing UI exists), but kept in the schema since the backend returns them. |

**If your backend's song or playlist shape ever changes** (renamed/added/
removed field), update it in all of these places together:
- `home.js` (`playlistTileHTML`) — playlist field names
- `playlistPage.js` (`trackRowHTML`, `recommendRowHTML`, header rendering
  in `openPlaylistPage`)
- `playerPage.js` (`renderMiniPlayer`, `renderPlayerPage`, `renderCredits`)
- `queuePage.js` (`queueRowHTML`)
- `search.js` (`searchResultRowHTML`)

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
