from __future__ import annotations

from downloader import SpotifyDownloader
from database import get_connection

from queries import (
    UPSERT_USER,
    UPSERT_ARTIST,
    UPSERT_ARTIST_IMAGE,
    UPSERT_ALBUM,
    UPSERT_ALBUM_IMAGE,
    UPSERT_TRACK,
    UPSERT_TRACK_ARTIST,
    UPSERT_PLAYLIST,
    UPSERT_PLAYLIST_IMAGE,
    DELETE_PLAYLIST_TRACKS,
    INSERT_PLAYLIST_TRACK,
)


class SpotifyImporter:

    def __init__(self):
        self.downloader = SpotifyDownloader()

    # ==========================================================================
    # Public API
    # ==========================================================================

    def import_playlist(self, playlist_id: str):

        print(f"Downloading playlist {playlist_id}...")

        playlist = self.downloader.get_playlist(playlist_id)
        playlist_items = self.downloader.get_playlist_items(playlist_id)

        print(f"Playlist contains {len(playlist_items)} entries.")

        # ----------------------------------------------------------------------
        # Collect IDs
        # ----------------------------------------------------------------------

        artist_ids = set()
        album_ids = set()
        track_ids = set()

        for item in playlist_items:

            track = item.get("track")

            if not track:
                continue

            if not track.get("id"):
                continue

            track_ids.add(track["id"])

            if track.get("album", {}).get("id"):
                album_ids.add(track["album"]["id"])

            for artist in track.get("artists", []):

                if artist.get("id"):
                    artist_ids.add(artist["id"])

        print(f"Tracks : {len(track_ids)}")
        print(f"Albums : {len(album_ids)}")
        print(f"Artists: {len(artist_ids)}")

        # ----------------------------------------------------------------------
        # Download full metadata
        # ----------------------------------------------------------------------

        tracks = self.downloader.get_tracks(track_ids)
        albums = self.downloader.get_albums(album_ids)
        artists = self.downloader.get_artists(artist_ids)

        album_lookup = {
            album["id"]: album
            for album in albums
        }

        artist_lookup = {
            artist["id"]: artist
            for artist in artists
        }

        # ----------------------------------------------------------------------
        # Build rows
        # ----------------------------------------------------------------------

        user_rows = {}
        playlist_rows = []
        playlist_image_rows = []

        artist_rows = []
        artist_image_rows = []

        album_rows = []
        album_image_rows = []

        track_rows = []
        track_artist_rows = []

        playlist_track_rows = []

        # ----------------------------------------------------------------------
        # Playlist Owner
        # ----------------------------------------------------------------------

        owner = playlist["owner"]

        user_rows[owner["id"]] = {
            "id": owner["id"],
            "display_name": owner.get("display_name"),
            "href": owner.get("href"),
            "uri": owner.get("uri"),
            "type": owner.get("type"),
            "external_url": owner.get("external_urls", {}).get("spotify"),
        }

        # ----------------------------------------------------------------------
        # Playlist
        # ----------------------------------------------------------------------

        playlist_rows.append({

            "id": playlist["id"],
            "owner_id": owner["id"],
            "name": playlist["name"],
            "description": playlist.get("description"),
            "collaborative": playlist.get("collaborative"),
            "public": playlist.get("public"),
            "snapshot_id": playlist.get("snapshot_id"),
            "followers": playlist.get("followers", {}).get("total"),
            "href": playlist.get("href"),
            "uri": playlist.get("uri"),
            "type": playlist.get("type"),
            "external_url": playlist.get("external_urls", {}).get("spotify"),
            "primary_color": playlist.get("primary_color"),

        })

        for i, image in enumerate(playlist.get("images", [])):

            playlist_image_rows.append({

                "playlist_id": playlist["id"],
                "image_order": i,
                "url": image.get("url"),
                "height": image.get("height"),
                "width": image.get("width"),

            })

        # ----------------------------------------------------------------------
        # Artists
        # ----------------------------------------------------------------------

        for artist in artists:

            artist_rows.append({

                "id": artist["id"],
                "name": artist["name"],
                "href": artist.get("href"),
                "uri": artist.get("uri"),
                "type": artist.get("type"),
                "popularity": artist.get("popularity"),
                "followers": artist.get("followers", {}).get("total"),
                "genres": artist.get("genres"),
                "external_url": artist.get("external_urls", {}).get("spotify"),

            })

            for i, image in enumerate(artist.get("images", [])):

                artist_image_rows.append({

                    "artist_id": artist["id"],
                    "image_order": i,
                    "url": image.get("url"),
                    "height": image.get("height"),
                    "width": image.get("width"),

                })

        # ----------------------------------------------------------------------
        # Albums
        # ----------------------------------------------------------------------

        for album in albums:

            album_rows.append({

                "id": album["id"],
                "name": album["name"],
                "album_type": album.get("album_type"),
                "album_group": album.get("album_group"),
                "total_tracks": album.get("total_tracks"),
                "release_date": album.get("release_date"),
                "release_date_precision": album.get("release_date_precision"),
                "href": album.get("href"),
                "uri": album.get("uri"),
                "type": album.get("type"),
                "label": album.get("label"),
                "popularity": album.get("popularity"),
                "external_url": album.get("external_urls", {}).get("spotify"),

            })

            for i, image in enumerate(album.get("images", [])):

                album_image_rows.append({

                    "album_id": album["id"],
                    "image_order": i,
                    "url": image.get("url"),
                    "height": image.get("height"),
                    "width": image.get("width"),

                })

        # ----------------------------------------------------------------------
        # Tracks
        # ----------------------------------------------------------------------

        for track in tracks:

            album = track.get("album")

            track_rows.append({

                "id": track["id"],
                "album_id": album.get("id") if album else None,
                "name": track["name"],
                "disc_number": track.get("disc_number"),
                "track_number": track.get("track_number"),
                "duration_ms": track.get("duration_ms"),
                "explicit": track.get("explicit"),
                "is_local": track.get("is_local"),
                "is_playable": track.get("is_playable"),
                "popularity": track.get("popularity"),
                "preview_url": track.get("preview_url"),
                "href": track.get("href"),
                "uri": track.get("uri"),
                "type": track.get("type"),
                "external_url": track.get("external_urls", {}).get("spotify"),
                "spotify_isrc": track.get("external_ids", {}).get("isrc"),
                "spotify_ean": track.get("external_ids", {}).get("ean"),
                "spotify_upc": track.get("external_ids", {}).get("upc"),

            })

            for order, artist in enumerate(track.get("artists", []), start=1):

                track_artist_rows.append({

                    "track_id": track["id"],
                    "artist_id": artist["id"],
                    "artist_order": order,

                })

        # ----------------------------------------------------------------------
        # Playlist Tracks
        # ----------------------------------------------------------------------

        for position, item in enumerate(playlist_items):

            track = item.get("track")

            if not track:
                continue

            added_by = item.get("added_by")

            if added_by and added_by.get("id"):

                user_rows[added_by["id"]] = {

                    "id": added_by["id"],
                    "display_name": added_by.get("display_name"),
                    "href": added_by.get("href"),
                    "uri": added_by.get("uri"),
                    "type": added_by.get("type"),
                    "external_url": added_by.get(
                        "external_urls", {}
                    ).get("spotify"),

                }

            playlist_track_rows.append({

                "playlist_id": playlist["id"],
                "track_id": track["id"],
                "position": position,
                "added_at": item.get("added_at"),
                "added_by": added_by.get("id") if added_by else None,
                "is_local": item.get("is_local"),

            })

        # ----------------------------------------------------------------------
        # Import
        # ----------------------------------------------------------------------

        print("Importing into PostgreSQL...")

        with get_connection() as conn:

            with conn.cursor() as cur:

                cur.executemany(
                    UPSERT_USER,
                    list(user_rows.values())
                )

                cur.executemany(
                    UPSERT_ARTIST,
                    artist_rows
                )

                cur.executemany(
                    UPSERT_ARTIST_IMAGE,
                    artist_image_rows
                )

                cur.executemany(
                    UPSERT_ALBUM,
                    album_rows
                )

                cur.executemany(
                    UPSERT_ALBUM_IMAGE,
                    album_image_rows
                )

                cur.executemany(
                    UPSERT_TRACK,
                    track_rows
                )

                cur.executemany(
                    UPSERT_TRACK_ARTIST,
                    track_artist_rows
                )

                cur.executemany(
                    UPSERT_PLAYLIST,
                    playlist_rows
                )

                cur.executemany(
                    UPSERT_PLAYLIST_IMAGE,
                    playlist_image_rows
                )

                cur.execute(
                    DELETE_PLAYLIST_TRACKS,
                    (playlist["id"],)
                )

                cur.executemany(
                    INSERT_PLAYLIST_TRACK,
                    playlist_track_rows
                )

        print("Import complete.")
