from __future__ import annotations

from typing import Iterable

from spotipy import Spotify

from client import get_spotify_client
from config import (
    PLAYLIST_PAGE_SIZE,
    ARTIST_BATCH_SIZE,
)

ALBUM_BATCH_SIZE = 20      # Spotify limit
TRACK_BATCH_SIZE = 50      # Spotify limit


class SpotifyDownloader:
    """
    High-level wrapper around the Spotify Web API.

    Handles:
        - pagination
        - batching
        - authenticated client creation

    Returns Spotify response dictionaries unchanged.
    """

    def __init__(self, spotify: Spotify | None = None):
        self.sp = spotify or get_spotify_client()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def chunk(iterable: Iterable, size: int):
        iterable = list(iterable)

        for i in range(0, len(iterable), size):
            yield iterable[i:i + size]

    # ------------------------------------------------------------------
    # Playlist
    # ------------------------------------------------------------------

    def get_playlist(self, playlist_id: str) -> dict:
        """
        Download playlist metadata.
        """

        return self.sp.playlist(
            playlist_id=playlist_id,
            fields=None,
        )

    def get_playlist_items(self, playlist_id: str) -> list[dict]:
        """
        Download every playlist item.
        """

        items = []

        results = self.sp.playlist_items(
            playlist_id,
            additional_types=("track",),
            limit=PLAYLIST_PAGE_SIZE,
        )

        while True:

            items.extend(results["items"])

            if results["next"]:
                results = self.sp.next(results)
            else:
                break

        return items

    # ------------------------------------------------------------------
    # Artists
    # ------------------------------------------------------------------

    def get_artists(self, artist_ids: Iterable[str]) -> list[dict]:

        artist_ids = [
            artist_id
            for artist_id in artist_ids
            if artist_id
        ]

        artists = []

        for batch in self.chunk(artist_ids, ARTIST_BATCH_SIZE):

            response = self.sp.artists(batch)

            artists.extend(response["artists"])

        return artists

    # ------------------------------------------------------------------
    # Albums
    # ------------------------------------------------------------------

    def get_albums(self, album_ids: Iterable[str]) -> list[dict]:

        album_ids = [
            album_id
            for album_id in album_ids
            if album_id
        ]

        albums = []

        for batch in self.chunk(album_ids, ALBUM_BATCH_SIZE):

            response = self.sp.albums(batch)

            albums.extend(response["albums"])

        return albums

    # ------------------------------------------------------------------
    # Tracks
    # ------------------------------------------------------------------

    def get_tracks(self, track_ids: Iterable[str]) -> list[dict]:

        track_ids = [
            track_id
            for track_id in track_ids
            if track_id
        ]

        tracks = []

        for batch in self.chunk(track_ids, TRACK_BATCH_SIZE):

            response = self.sp.tracks(batch)

            tracks.extend(response["tracks"])

        return tracks