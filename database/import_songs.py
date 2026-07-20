from io import StringIO
import pandas as pd
import psycopg

import os

DATABASE_URL = os.environ["DATABASE_URL"]
CSV_PATH = os.environ["DATASET_PATH"]


print("Reading CSV...")

df = pd.read_csv(CSV_PATH)

print(f"Loaded {len(df):,} songs.")

# -------------------------------------------------------
# Data Cleaning
# -------------------------------------------------------

# New column that doesn't exist in the original dataset
df["track_youtube_id"] = None

# PostgreSQL likes NULL instead of NaN
df = df.where(pd.notnull(df), None)

# Keep only database columns in the correct order
df = df[
    [
        "track_id",
        "artists",
        "album_name",
        "track_name",
        "popularity",
        "duration_ms",
        "explicit",
        "danceability",
        "energy",
        "key",
        "loudness",
        "mode",
        "speechiness",
        "acousticness",
        "instrumentalness",
        "liveness",
        "valence",
        "tempo",
        "time_signature",
        "track_genre",
        "track_youtube_id",
    ]
]

print("Preparing COPY buffer...")

buffer = StringIO()

df.to_csv(
    buffer,
    index=False,
    header=False,
    na_rep="\\N",          # PostgreSQL NULL
)

buffer.seek(0)

print("Uploading to PostgreSQL...")

with psycopg.connect(DATABASE_URL) as conn:

    with conn.cursor() as cur:

        with cur.copy(
            """
            COPY songs (

                track_id,
                artists,
                album_name,
                track_name,
                popularity,
                duration_ms,
                explicit,
                danceability,
                energy,
                key,
                loudness,
                mode,
                speechiness,
                acousticness,
                instrumentalness,
                liveness,
                valence,
                tempo,
                time_signature,
                track_genre,
                track_youtube_id

            )

            FROM STDIN
            WITH (
                FORMAT CSV,
                NULL '\\N'
            )
            """
        ) as copy:

            copy.write(buffer.read())

    conn.commit()

print("✅ Import completed successfully.")
