from pathlib import Path
import os
import pickle

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# ==============================================================================
# Configuration
# ==============================================================================

CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SPOTIFY_CLIENT_SECRET"]
# Example 1 - The Voyage of 67 64wkinQzeyoBls7ES3RD6Z
# Example 2 - Velocity 6Db1zZcoO7JPczkjjU4vuX

PLAYLIST_ID = "6Db1zZcoO7JPczkjjU4vuX"

# All outputs for this playlist will be written here
OUTPUT_DIR = Path("debug") / PLAYLIST_ID
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ARTIST_BATCH_SIZE = 50

# ==============================================================================
# Spotify Client
# ==============================================================================

sp = spotipy.Spotify(
    auth_manager=SpotifyClientCredentials(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
)

# ==============================================================================
# Helpers
# ==============================================================================

def chunks(seq, size):
    """Yield successive chunks from a list."""
    for i in range(0, len(seq), size):
        yield seq[i:i + size]

# ==============================================================================
# Step 1. Download Playlist
# ==============================================================================

print("Downloading playlist...")

playlist_items = []

results = sp.playlist_items(
    PLAYLIST_ID,
    additional_types=["track"],
    limit=100,
)

while True:

    playlist_items.extend(results["items"])

    if results["next"]:
        results = sp.next(results)
    else:
        break

print(f"Downloaded {len(playlist_items)} playlist entries.")

with open(OUTPUT_DIR / "playlist_items.pkl", "wb") as f:
    pickle.dump(playlist_items, f)

# ==============================================================================
# Step 2. Extract Tracks & Artist IDs
# ==============================================================================

tracks = []
artist_ids = set()

for item in playlist_items:

    track = item.get("track")

    if track is None:
        continue

    if track.get("id") is None:
        continue

    tracks.append(track)

    for artist in track.get("artists", []):

        if artist.get("id"):
            artist_ids.add(artist["id"])

artist_ids = list(artist_ids)

print(f"Tracks: {len(tracks)}")
print(f"Unique artists: {len(artist_ids)}")

# ==============================================================================
# Step 3. Download Artists (Batch)
# ==============================================================================

print("Downloading artist metadata...")

artists = []

for batch in chunks(artist_ids, ARTIST_BATCH_SIZE):

    response = sp.artists(batch)

    artists.extend(response["artists"])

print(f"Downloaded metadata for {len(artists)} artists.")

with open(OUTPUT_DIR / "artists.pkl", "wb") as f:
    pickle.dump(artists, f)

artist_lookup = {
    artist["id"]: artist
    for artist in artists
}

# ==============================================================================
# Step 4. Build Song Records
# ==============================================================================

print("Building song dataset...")

songs = []

for track in tracks:

    first_artist = track["artists"][0]

    artist = artist_lookup.get(first_artist["id"], {})

    genres = artist.get("genres", [])

    songs.append({

        # Primary Key
        "track_id": track["id"],

        # Metadata
        "artists": ", ".join(
            artist["name"]
            for artist in track["artists"]
        ),

        "album_name": track["album"]["name"],

        "track_name": track["name"],

        "popularity": track["popularity"],

        "duration_ms": track["duration_ms"],

        "explicit": str(track["explicit"]),

        # ----------------------------------------------------------------------
        # Spotify Audio Features API is unavailable for new applications.
        # Keep schema-compatible NULL values.
        # ----------------------------------------------------------------------

        "danceability": None,
        "energy": None,
        "key": None,
        "loudness": None,
        "mode": None,
        "speechiness": None,
        "acousticness": None,
        "instrumentalness": None,
        "liveness": None,
        "valence": None,
        "tempo": None,
        "time_signature": None,

        # Artist genres
        "track_genre": ", ".join(genres) if genres else None,

        # Spotify API does not provide YouTube IDs
        "track_youtube_id": None,

    })

print(f"Built {len(songs)} song records.")

# ==============================================================================
# Save Processed Dataset
# ==============================================================================

with open(OUTPUT_DIR / "songs.pkl", "wb") as f:
    pickle.dump(songs, f)

print()
print("Done.")
print(f"Output directory: {OUTPUT_DIR.resolve()}")
print(f"Files written:")
print(f"  - {OUTPUT_DIR / 'playlist_items.pkl'}")
print(f"  - {OUTPUT_DIR / 'artists.pkl'}")
print(f"  - {OUTPUT_DIR / 'songs.pkl'}")

