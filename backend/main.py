from anyio.streams import stapled
import psycopg
from psycopg.rows import dict_row

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .song_model import SongUpdate
import os
import pickle 
from pathlib import Path
import joblib
import pandas as pd 

from .spotify_importer.queries import GET_PLAYLIST_SONGS, GET_PLAYLISTS


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"
SONG_PATH = BASE_DIR / "songs.pkl"

DATABASE_URL = os.environ["DATABASE_URL"]

model = joblib.load(MODEL_PATH)

songs_table= joblib.load(SONG_PATH)



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
    )


def fetch_all(query: str, params: tuple = ()):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()


def execute(query: str, params: tuple = ()):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount


# --------------------------
# Endpoints
# --------------------------



@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Song Recommendation API"
    }

# Get songs by playlist id
@app.get("/playlists/{playlist_id}/songs")
def get_playlist_songs(playlist_id: str):
    return fetch_all(
        GET_PLAYLIST_SONGS,
        (playlist_id,),
    )


# Get a song by its id
@app.get("/song/{track_id}")
def get_song_by_id(track_id: str):
    return fetch_all(
        "SELECT * FROM songs WHERE track_id = %s",
        (track_id,),
    )

@app.get("/songs")
def all_songs():
    return fetch_all(
        "SELECT * FROM songs ORDER BY RANDOM() LIMIT 50"
    )


@app.get("/songs/search")
def search_songs(q: str=None, artist_name: str=None):
    search = f"%{q}%"

    return fetch_all(
        """
        SELECT *
        FROM songs
        WHERE artists ILIKE %s
           OR track_name ILIKE %s
        ORDER BY popularity DESC
        """,
        (search, search),
    )


@app.get("/recommend")
def recommend(track_id: str = None, playlist_id: str = None):

    if track_id:
        # Get songs by track id
        song_features = pd.DataFrame(get_song_by_id(track_id))
    elif playlist_id:
        # Get songs by playlist
        song_features = pd.DataFrame(get_playlist_songs(playlist_id))
    else:
        return {"message": "Pass either playlist id or track id"}

    feature_keys=[
        'popularity','duration_ms','danceability',
        'energy','key','loudness','mode',
        'speechiness','acousticness','instrumentalness',
        'liveness','valence','tempo','time_signature'
    ]
    distances, indices = model.kneighbors(song_features[feature_keys])
    recommended_songs = songs_table.iloc[indices[0]]
    print(recommended_songs)
    return recommended_songs.to_dict(orient="records")


@app.get("/playlists")
def get_playlists():
    return fetch_all(
        GET_PLAYLISTS
    )
