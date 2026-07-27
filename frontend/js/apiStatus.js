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
 * Uses apiCall() (utils.js) like every other request in the app, so this
 * check gets the same retry-with-timeout behavior (see "When something
 * goes wrong" in the README) — it won't flip to "Offline" on one hiccup,
 * only after the full retry budget is exhausted.
 * -----------------------------------------------------------------------------
 */

const API_STATUS_CHECK_INTERVAL_MS = 30000;

async function checkApiStatus() {
  const dot = document.getElementById('apiStatusDot');
  const text = document.getElementById('apiStatusText');

  const { error } = await apiCall(ENDPOINTS.health());

  if (error) {
    dot.className = 'status-dot status-offline';
    text.textContent = 'API Offline / Unreachable';
  } else {
    dot.className = 'status-dot status-online';
    text.textContent = 'API Active';
  }
}

checkApiStatus();
setInterval(checkApiStatus, API_STATUS_CHECK_INTERVAL_MS);
