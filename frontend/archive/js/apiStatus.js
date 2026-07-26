/**
 * apiStatus.js
 * -----------------------------------------------------------------------------
 * Sidebar "API Status" indicator. Instead of printing raw setup instructions,
 * this actually checks whether the backend (see js/env.js -> API_BASE) is
 * reachable, and shows a stylized red/green dot + label:
 *   - green "API Active"              -> last check succeeded
 *   - red   "API Offline / Unreachable" -> last check failed
 *
 * It checks once on page load, then again every API_STATUS_CHECK_INTERVAL_MS
 * so the indicator stays accurate if the backend goes down/comes back up
 * while the page is open.
 *
 * WHERE TO CHANGE THINGS:
 *   - This pings GET /songs as a lightweight "is the backend up" check. If
 *     your backend has a dedicated health-check route (e.g. GET /health),
 *     point the fetch below at that instead — it's cheaper than fetching
 *     the whole song list just to check status.
 * -----------------------------------------------------------------------------
 */

const API_STATUS_CHECK_INTERVAL_MS = 30000;

async function checkApiStatus() {
  const dot = document.getElementById('apiStatusDot');
  const text = document.getElementById('apiStatusText');

  try {
    const res = await fetch(ENDPOINTS.songs(), { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    dot.className = 'status-dot status-online';
    text.textContent = 'API Active';
  } catch (err) {
    dot.className = 'status-dot status-offline';
    text.textContent = 'API Offline / Unreachable';
  }
}

checkApiStatus();
setInterval(checkApiStatus, API_STATUS_CHECK_INTERVAL_MS);
