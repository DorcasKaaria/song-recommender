from io import StringIO
import os

import pandas as pd
import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
CSV_PATH = os.environ["DATASET_PATH"]

print("Reading CSV...")

df = pd.read_csv(CSV_PATH)

print(f"Loaded {len(df):,} songs.")

# -------------------------------------------------------
# Data Cleaning
# -------------------------------------------------------

# Remove duplicate track_ids inside the CSV itself
before = len(df)
df = df.drop_duplicates(subset=["track_id"], keep="first")
after = len(df)

print(f"Removed {before - after:,} duplicate rows from CSV.")

# New column that doesn't exist in the original dataset
df["track_youtube_id"] = None

# PostgreSQL NULL instead of NaN
df = df.where(pd.notnull(df), None)

# Keep only database columns in the correct order
columns = [
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

df = df[columns]

print("Preparing COPY buffer...")

buffer = StringIO()

df.to_csv(
    buffer,
    index=False,
    header=False,
    na_rep="\\N",
)

buffer.seek(0)

print("Uploading to temporary table...")

with psycopg.connect(DATABASE_URL) as conn:

    with conn.cursor() as cur:

        # -------------------------------------------------------
        # Temporary table
        # -------------------------------------------------------

        cur.execute("""
            CREATE TEMP TABLE songs_import
            (LIKE songs INCLUDING DEFAULTS)
            ON COMMIT DROP;
        """)

        # -------------------------------------------------------
        # COPY into temp table
        # -------------------------------------------------------

        with cur.copy(
            f"""
            COPY songs_import (
                {",".join(columns)}
            )
            FROM STDIN
            WITH (
                FORMAT CSV,
                NULL '\\N'
            )
            """
        ) as copy:

            copy.write(buffer.read())

        print("Merging into songs table...")

        cur.execute("""
            INSERT INTO songs
            SELECT *
            FROM songs_import
            ON CONFLICT (track_id)
            DO NOTHING;
        """)

        inserted = cur.rowcount

    conn.commit()

print(f"✅ Import complete.")
print(f"Inserted approximately {inserted:,} new songs.")
