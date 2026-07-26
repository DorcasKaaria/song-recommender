/**
 * env.example.js
 * -----------------------------------------------------------------------------
 * TEMPLATE for local/deployment configuration.
 *
 * HOW TO USE:
 *   1. Copy this file and rename the copy to "env.js".
 *   2. Edit the values inside env.js to match your setup.
 *   3. env.js is listed in .gitignore, so it will NOT be committed to git.
 *      This means every teammate (or every deployment: local / staging / prod)
 *      can point at their own backend without editing tracked source code.
 *
 * index.html loads env.js BEFORE config.js, so window.APP_CONFIG is already
 * set by the time config.js reads it.
 *
 * If env.js is ever missing (e.g. you forgot step 1), config.js falls back
 * to a sensible default so the app still runs.
 * -----------------------------------------------------------------------------
 */
window.APP_CONFIG = {
  // Base URL of your backend API (FastAPI/Flask/etc).
  // Change this when:
  //   - your backend runs on a different port locally
  //   - you deploy the backend to a staging or production server
  API_BASE: "http://127.0.0.1:8000",
};
