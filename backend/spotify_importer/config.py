from pathlib import Path
import os

# =============================================================================
# Spotify Credentials
# =============================================================================

SPOTIFY_CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
SPOTIFY_CLIENT_SECRET = os.environ["SPOTIFY_CLIENT_SECRET"]

# =============================================================================
# PostgreSQL
# =============================================================================

DATABASE_URL = os.environ["DATABASE_URL"]

# =============================================================================
# Spotify API
# =============================================================================

PLAYLIST_PAGE_SIZE = 100          # Spotify maximum
ARTIST_BATCH_SIZE = 50            # Spotify maximum

# =============================================================================
# Output
# =============================================================================

OUTPUT_ROOT = Path("song_data")
OUTPUT_ROOT.mkdir(exist_ok=True)
