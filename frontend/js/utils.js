/**
 * utils.js
 * -----------------------------------------------------------------------------
 * Small, generic helper functions shared by every page. None of these know
 * anything about "songs" or "genres" specifically — they're plumbing used by
 * the page-specific files (home.js, search.js, etc).
 * -----------------------------------------------------------------------------
 */

const ERROR_MESSAGE = "Something Went Wrong";

/**
 * Returns "Good morning" / "Good afternoon" / "Good evening" / "Good
 * night" based on the person's ACTUAL local time — `new Date()` already
 * reflects the browser's local timezone (whatever that is, wherever they
 * are), so no separate timezone lookup is needed. Used by home.js for the
 * Home page's greeting.
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

/**
 * Formats a duration for display as m:ss.
 * IMPORTANT: the backend returns song duration in MILLISECONDS
 * (`duration_ms`), so this expects milliseconds, not seconds.
 */
function fmtDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * A ready-to-insert error block for any page section that failed to load
 * data from the backend, e.g. `container.innerHTML = errorStateHTML(error);`.
 * Pass the specific message from apiCall()'s `error` field when you have
 * one — falls back to a generic message if you don't.
 */
function errorStateHTML(message = ERROR_MESSAGE) {
  return `<div class="empty-state"><p class="error-text">${escapeHTML(message)}</p></div>`;
}

/**
 * apiCall(url, options)
 * Thin wrapper around fetch() for talking to the backend (see config.js for
 * the URLs). Always returns { data, error }:
 *   - success: { data: <parsed json>, error: null }
 *   - failure: { data: null, error: "<path> returned <status>: <statusText>" }
 *     (or "<path> failed: <network error message>" if the request never
 *     got a response at all — backend down, DNS failure, timeout, etc.)
 *
 * RETRIES: some endpoints (recommendations especially) can be slow or
 * flaky. Rather than failing on the first hiccup, this retries — with a
 * short pause between attempts — until API_TOTAL_TIMEOUT_MS (6.7s) has
 * elapsed in total, THEN reports failure. Each individual attempt uses its
 * own shorter timeout (API_ATTEMPT_TIMEOUT_MS) so one hung request can't
 * eat the whole budget by itself. Non-recoverable failures (4xx client
 * errors) are NOT retried — retrying the exact same bad request won't fix
 * it, so those return immediately.
 *
 * Every caller MUST check `error` and show it to the user — e.g.
 * `container.innerHTML = errorStateHTML(error)` or `showToast(error, 'error')`.
 * Never let a failed request pass through silently.
 */
const API_TOTAL_TIMEOUT_MS = 8000;   // report failure only after this long has passed, total
const API_ATTEMPT_TIMEOUT_MS = 4000; // per-attempt timeout, so retries fit inside the budget above
const API_RETRY_DELAY_MS = 400;      // pause between retries

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiCall(url, options = {}) {
  let path;
  try {
    path = new URL(url).pathname + new URL(url).search;
  } catch (err) {
    path = url;
  }

  const deadline = Date.now() + API_TOTAL_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    const attemptTimeout = Math.min(API_ATTEMPT_TIMEOUT_MS, deadline - Date.now());

    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(attemptTimeout) });

      if (!res.ok) {
        lastError = `${path} returned ${res.status}: ${res.statusText || 'Error'}`;
        // Retry server errors (5xx) — a 4xx client error won't fix itself
        // by retrying the identical request, so don't waste the budget on it.
        if (res.status >= 500 && Date.now() + API_RETRY_DELAY_MS < deadline) {
          await sleep(API_RETRY_DELAY_MS);
          continue;
        }
        console.error('API request failed:', lastError);
        return { data: null, error: lastError };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      // Network error, CORS failure, or this attempt's timeout — worth retrying.
      lastError = `${path} failed: ${err.message || 'Network error'}`;
      if (Date.now() + API_RETRY_DELAY_MS >= deadline) break;
      await sleep(API_RETRY_DELAY_MS);
    }
  }

  console.error('API request failed after retries:', lastError);
  return { data: null, error: lastError || `${path} failed: Timed out` };
}

/**
 * Shows a small toast in the bottom-right corner. `durationMs` controls how
 * long it stays up before fading out (default 3s; the queue-mode messages
 * in player.js use a longer 5s per the spec).
 */
function showToast(message, type = "success", durationMs = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}
