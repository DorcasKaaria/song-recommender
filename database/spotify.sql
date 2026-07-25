CREATE TABLE IF NOT EXISTS spotify_users (
    id                  TEXT PRIMARY KEY,
    display_name        TEXT,
    href                TEXT,
    uri                 TEXT,
    type                TEXT,
    external_url        TEXT
);

CREATE TABLE IF NOT EXISTS artists (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    href                TEXT,
    uri                 TEXT,
    type                TEXT,
    popularity          INTEGER,
    followers           INTEGER,
    genres              TEXT[],
    external_url        TEXT
/*Spotify returns an array of strings.*/
);

CREATE TABLE IF NOT EXISTS artist_images (
    artist_id           TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    image_order         INTEGER NOT NULL,
    url                 TEXT NOT NULL,
    height              INTEGER,
    width               INTEGER,

    PRIMARY KEY (artist_id, image_order)
);

CREATE TABLE IF NOT EXISTS artist_images (
    artist_id           TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    image_order         INTEGER NOT NULL,
    url                 TEXT NOT NULL,
    height              INTEGER,
    width               INTEGER,

    PRIMARY KEY (artist_id, image_order)
);

CREATE TABLE IF NOT EXISTS albums (
    id                          TEXT PRIMARY KEY,

    name                        TEXT NOT NULL,

    album_type                  TEXT,

    album_group                 TEXT,

    total_tracks                INTEGER,

    release_date                TEXT,

    release_date_precision      TEXT,

    href                        TEXT,

    uri                         TEXT,

    type                        TEXT,

    label                       TEXT,

    popularity                  INTEGER,

    external_url                TEXT
);


CREATE TABLE IF NOT EXISTS album_images (
    album_id            TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,

    image_order         INTEGER NOT NULL,

    url                 TEXT NOT NULL,

    height              INTEGER,

    width               INTEGER,

    PRIMARY KEY (album_id, image_order)
);


CREATE TABLE IF NOT EXISTS tracks (

    id                          TEXT PRIMARY KEY,

    album_id                    TEXT REFERENCES albums(id),

    name                        TEXT NOT NULL,

    disc_number                 INTEGER,

    track_number                INTEGER,

    duration_ms                 INTEGER,

    explicit                    BOOLEAN,

    is_local                    BOOLEAN,

    is_playable                 BOOLEAN,

    popularity                  INTEGER,

    preview_url                 TEXT,

    href                        TEXT,

    uri                         TEXT,

    type                        TEXT,

    external_url                TEXT,

    spotify_isrc                TEXT,

    spotify_ean                 TEXT,

    spotify_upc                 TEXT
);

CREATE TABLE IF NOT EXISTS track_artists (

    track_id        TEXT REFERENCES tracks(id) ON DELETE CASCADE,

    artist_id       TEXT REFERENCES artists(id),

    artist_order    INTEGER,

    PRIMARY KEY (track_id, artist_id)
);


CREATE TABLE IF NOT EXISTS playlists (

    id                      TEXT PRIMARY KEY,

    owner_id                TEXT REFERENCES spotify_users(id),

    name                    TEXT NOT NULL,

    description             TEXT,

    collaborative           BOOLEAN,

    public                  BOOLEAN,

    snapshot_id             TEXT,

    followers               INTEGER,

    href                    TEXT,

    uri                     TEXT,

    type                    TEXT,

    external_url            TEXT,

    primary_color           TEXT
);


CREATE TABLE IF NOT EXISTS playlist_images (

    playlist_id         TEXT REFERENCES playlists(id) ON DELETE CASCADE,

    image_order         INTEGER,

    url                 TEXT,

    height              INTEGER,

    width               INTEGER,

    PRIMARY KEY (playlist_id, image_order)
);


CREATE TABLE IF NOT EXISTS playlist_tracks (

    playlist_id             TEXT REFERENCES playlists(id) ON DELETE CASCADE,

    track_id                TEXT REFERENCES tracks(id),

    position                INTEGER,

    added_at                TIMESTAMPTZ,

    added_by                TEXT REFERENCES spotify_users(id),

    is_local                BOOLEAN,

    PRIMARY KEY (playlist_id, position)
);


CREATE INDEX idx_tracks_album
ON tracks(album_id);

CREATE INDEX idx_track_artists_artist
ON track_artists(artist_id);

CREATE INDEX idx_playlist_tracks_track
ON playlist_tracks(track_id);

CREATE INDEX idx_playlist_tracks_playlist
ON playlist_tracks(playlist_id);

CREATE INDEX idx_albums_name
ON albums(name);

CREATE INDEX idx_artists_name
ON artists(name);


ALTER TABLE playlist_tracks
DROP CONSTRAINT playlist_tracks_playlist_id_fkey;

ALTER TABLE playlist_tracks
ADD CONSTRAINT playlist_tracks_playlist_id_fkey
FOREIGN KEY (playlist_id)
REFERENCES playlists(id)
ON DELETE CASCADE;


CREATE TABLE album_artists (
    album_id      TEXT REFERENCES albums(id) ON DELETE CASCADE,
    artist_id     TEXT REFERENCES artists(id),
    artist_order  INTEGER NOT NULL,
    PRIMARY KEY (album_id, artist_id)
);
