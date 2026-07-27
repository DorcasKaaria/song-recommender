import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

from config import (
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
)


def get_spotify_client() -> spotipy.Spotify:
    """
    Return an authenticated Spotify client.
    """

    return spotipy.Spotify(
        auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
        )
    )
