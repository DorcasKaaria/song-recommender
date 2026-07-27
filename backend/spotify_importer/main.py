import argparse

from importer import SpotifyImporter


def main():

    parser = argparse.ArgumentParser(
        description="Import a Spotify playlist into PostgreSQL."
    )

    parser.add_argument(
        "playlist_id",
        help="Spotify Playlist ID",
    )

    args = parser.parse_args()

    importer = SpotifyImporter()
    importer.import_playlist(args.playlist_id)


if __name__ == "__main__":
    main()
