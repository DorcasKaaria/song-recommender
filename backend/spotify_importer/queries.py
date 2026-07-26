"""
SQL statements for Spotify metadata ingestion.
"""

# ==============================================================================
# Users
# ==============================================================================

UPSERT_USER = """
INSERT INTO spotify_users (
    id,
    display_name,
    href,
    uri,
    type,
    external_url
)
VALUES (
    %(id)s,
    %(display_name)s,
    %(href)s,
    %(uri)s,
    %(type)s,
    %(external_url)s
)
ON CONFLICT (id)
DO UPDATE SET
    display_name = EXCLUDED.display_name,
    href = EXCLUDED.href,
    uri = EXCLUDED.uri,
    type = EXCLUDED.type,
    external_url = EXCLUDED.external_url;
"""

# ==============================================================================
# Artists
# ==============================================================================

UPSERT_ARTIST = """
INSERT INTO artists (
    id,
    name,
    href,
    uri,
    type,
    popularity,
    followers,
    genres,
    external_url
)
VALUES (
    %(id)s,
    %(name)s,
    %(href)s,
    %(uri)s,
    %(type)s,
    %(popularity)s,
    %(followers)s,
    %(genres)s,
    %(external_url)s
)
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    href = EXCLUDED.href,
    uri = EXCLUDED.uri,
    type = EXCLUDED.type,
    popularity = EXCLUDED.popularity,
    followers = EXCLUDED.followers,
    genres = EXCLUDED.genres,
    external_url = EXCLUDED.external_url;
"""

UPSERT_ARTIST_IMAGE = """
INSERT INTO artist_images (
    artist_id,
    image_order,
    url,
    height,
    width
)
VALUES (
    %(artist_id)s,
    %(image_order)s,
    %(url)s,
    %(height)s,
    %(width)s
)
ON CONFLICT (artist_id, image_order)
DO UPDATE SET
    url = EXCLUDED.url,
    height = EXCLUDED.height,
    width = EXCLUDED.width;
"""

# ==============================================================================
# Albums
# ==============================================================================

UPSERT_ALBUM = """
INSERT INTO albums (
    id,
    name,
    album_type,
    album_group,
    total_tracks,
    release_date,
    release_date_precision,
    href,
    uri,
    type,
    label,
    popularity,
    external_url
)
VALUES (
    %(id)s,
    %(name)s,
    %(album_type)s,
    %(album_group)s,
    %(total_tracks)s,
    %(release_date)s,
    %(release_date_precision)s,
    %(href)s,
    %(uri)s,
    %(type)s,
    %(label)s,
    %(popularity)s,
    %(external_url)s
)
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    album_type = EXCLUDED.album_type,
    album_group = EXCLUDED.album_group,
    total_tracks = EXCLUDED.total_tracks,
    release_date = EXCLUDED.release_date,
    release_date_precision = EXCLUDED.release_date_precision,
    href = EXCLUDED.href,
    uri = EXCLUDED.uri,
    type = EXCLUDED.type,
    label = EXCLUDED.label,
    popularity = EXCLUDED.popularity,
    external_url = EXCLUDED.external_url;
"""

UPSERT_ALBUM_IMAGE = """
INSERT INTO album_images (
    album_id,
    image_order,
    url,
    height,
    width
)
VALUES (
    %(album_id)s,
    %(image_order)s,
    %(url)s,
    %(height)s,
    %(width)s
)
ON CONFLICT (album_id, image_order)
DO UPDATE SET
    url = EXCLUDED.url,
    height = EXCLUDED.height,
    width = EXCLUDED.width;
"""

# ==============================================================================
# Tracks
# ==============================================================================

UPSERT_TRACK = """
INSERT INTO tracks (
    id,
    album_id,
    name,
    disc_number,
    track_number,
    duration_ms,
    explicit,
    is_local,
    is_playable,
    popularity,
    preview_url,
    href,
    uri,
    type,
    external_url,
    spotify_isrc,
    spotify_ean,
    spotify_upc
)
VALUES (
    %(id)s,
    %(album_id)s,
    %(name)s,
    %(disc_number)s,
    %(track_number)s,
    %(duration_ms)s,
    %(explicit)s,
    %(is_local)s,
    %(is_playable)s,
    %(popularity)s,
    %(preview_url)s,
    %(href)s,
    %(uri)s,
    %(type)s,
    %(external_url)s,
    %(spotify_isrc)s,
    %(spotify_ean)s,
    %(spotify_upc)s
)
ON CONFLICT (id)
DO UPDATE SET
    album_id = EXCLUDED.album_id,
    name = EXCLUDED.name,
    disc_number = EXCLUDED.disc_number,
    track_number = EXCLUDED.track_number,
    duration_ms = EXCLUDED.duration_ms,
    explicit = EXCLUDED.explicit,
    is_local = EXCLUDED.is_local,
    is_playable = EXCLUDED.is_playable,
    popularity = EXCLUDED.popularity,
    preview_url = EXCLUDED.preview_url,
    href = EXCLUDED.href,
    uri = EXCLUDED.uri,
    type = EXCLUDED.type,
    external_url = EXCLUDED.external_url,
    spotify_isrc = EXCLUDED.spotify_isrc,
    spotify_ean = EXCLUDED.spotify_ean,
    spotify_upc = EXCLUDED.spotify_upc;
"""

UPSERT_TRACK_ARTIST = """
INSERT INTO track_artists (
    track_id,
    artist_id,
    artist_order
)
VALUES (
    %(track_id)s,
    %(artist_id)s,
    %(artist_order)s
)
ON CONFLICT (track_id, artist_id)
DO UPDATE SET
    artist_order = EXCLUDED.artist_order;
"""

# ==============================================================================
# Playlists
# ==============================================================================

UPSERT_PLAYLIST = """
INSERT INTO playlists (
    id,
    owner_id,
    name,
    description,
    collaborative,
    public,
    snapshot_id,
    followers,
    href,
    uri,
    type,
    external_url,
    primary_color
)
VALUES (
    %(id)s,
    %(owner_id)s,
    %(name)s,
    %(description)s,
    %(collaborative)s,
    %(public)s,
    %(snapshot_id)s,
    %(followers)s,
    %(href)s,
    %(uri)s,
    %(type)s,
    %(external_url)s,
    %(primary_color)s
)
ON CONFLICT (id)
DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    collaborative = EXCLUDED.collaborative,
    public = EXCLUDED.public,
    snapshot_id = EXCLUDED.snapshot_id,
    followers = EXCLUDED.followers,
    href = EXCLUDED.href,
    uri = EXCLUDED.uri,
    type = EXCLUDED.type,
    external_url = EXCLUDED.external_url,
    primary_color = EXCLUDED.primary_color;
"""

UPSERT_PLAYLIST_IMAGE = """
INSERT INTO playlist_images (
    playlist_id,
    image_order,
    url,
    height,
    width
)
VALUES (
    %(playlist_id)s,
    %(image_order)s,
    %(url)s,
    %(height)s,
    %(width)s
)
ON CONFLICT (playlist_id, image_order)
DO UPDATE SET
    url = EXCLUDED.url,
    height = EXCLUDED.height,
    width = EXCLUDED.width;
"""

DELETE_PLAYLIST_TRACKS = """
DELETE FROM playlist_tracks
WHERE playlist_id = %s;
"""

INSERT_PLAYLIST_TRACK = """
INSERT INTO playlist_tracks (
    playlist_id,
    track_id,
    position,
    added_at,
    added_by,
    is_local
)
VALUES (
    %(playlist_id)s,
    %(track_id)s,
    %(position)s,
    %(added_at)s,
    %(added_by)s,
    %(is_local)s
);
"""

GET_PLAYLIST_SONGS = """
SELECT
    pt.position,
    ai.url AS track_image,
    t.id AS track_id,
    t.name AS track_name,
    t.duration_ms,
    t.popularity,
    t.explicit,
    a.name AS album_name,
    STRING_AGG(ar.name, ', ' ORDER BY ta.artist_order) AS artists
FROM playlist_tracks pt
JOIN tracks t
    ON pt.track_id = t.id
LEFT JOIN albums a
    ON t.album_id = a.id
LEFT JOIN album_images ai
    ON a.id = ai.album_id
   AND ai.image_order = 0
LEFT JOIN track_artists ta
    ON ta.track_id = t.id
LEFT JOIN artists ar
    ON ar.id = ta.artist_id
WHERE pt.playlist_id = %s
GROUP BY
    pt.position,
    ai.url,
    t.id,
    t.name,
    t.duration_ms,
    t.popularity,
    t.explicit,
    a.name
ORDER BY pt.position;
"""

GET_PLAYLISTS="""
SELECT
    p.id,
    p.name,
    p.description,
    p.followers,
    p.public,
    p.collaborative,
    (
        SELECT url
        FROM playlist_images pi
        WHERE pi.playlist_id = p.id
        ORDER BY image_order
        LIMIT 1
    ) AS thumbnail_url,
    COUNT(pt.track_id) AS track_count
FROM playlists p
LEFT JOIN playlist_tracks pt
    ON pt.playlist_id = p.id
GROUP BY
    p.id,
    p.name,
    p.description,
    p.followers,
    p.public,
    p.collaborative
ORDER BY p.name;
"""
