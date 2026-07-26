/**
 * mockData.js
 * -----------------------------------------------------------------------------
 * LOCAL MOCK DATA — used as a fallback whenever the real backend (see
 * config.js / env.js) can't be reached, so the UI keeps working during
 * frontend development even before your data-science backend is ready.
 *
 * WHERE TO CHANGE THINGS:
 *   - Once your real backend is running, you generally won't need to touch
 *     this file — apiCall() in utils.js only falls back to this data when
 *     the real request fails.
 *   - Want more/different demo songs while building the UI? Edit the
 *     `titles` array inside seedSongs() below.
 * -----------------------------------------------------------------------------
 */

const GENRES = ["Pop", "Hip-Hop", "Rock", "Electronic", "R&B", "Jazz", "Classical", "Country", "Afrobeat"];
const ARTIST_ICONS = ["🎧", "🎤", "🎸", "🎹", "🥁", "🎺", "🎷", "🎻", "🪕"];

function randFeatures() {
  return {
    danceability: +(Math.random()).toFixed(2),
    energy: +(Math.random()).toFixed(2),
    valence: +(Math.random()).toFixed(2),
    tempo: Math.floor(60 + Math.random() * 120),
    acousticness: +(Math.random()).toFixed(2),
    instrumentalness: +(Math.random()).toFixed(2),
    liveness: +(Math.random()).toFixed(2),
    speechiness: +(Math.random()).toFixed(2),
  };
}

function seedSongs() {
  const titles = [
    ["Midnight Glow", "Nova Ray"], ["Electric Skyline", "The Voltz"], ["Golden Hour", "Amara Lane"],
    ["Concrete Dreams", "MC Riven"], ["Static Bloom", "Kiln"], ["Velvet Rain", "Nova Ray"],
    ["Neon Tide", "The Voltz"], ["Paper Moon", "June Ashworth"], ["Broken Chords", "Grit & Gold"],
    ["Savanna Nights", "Zuri Beats"], ["Glass Horizon", "Amara Lane"], ["Wildfire", "MC Riven"],
    ["Slow Burn", "June Ashworth"], ["Afterglow", "Kiln"], ["Lagos Nights", "Zuri Beats"],
    ["Empire State of Mind Pt.2", "Grit & Gold"], ["Ocean Drive", "Nova Ray"], ["Hollow Bones", "The Voltz"],
    ["City Lights", "Amara Lane"], ["Rebel Heart", "MC Riven"],
  ];
  return titles.map((t, i) => ({
    id: `song_${i + 1}`,
    title: t[0],
    artist: t[1],
    album: `${t[1]} — Sessions Vol. ${1 + (i % 3)}`,
    genre: GENRES[i % GENRES.length],
    duration: 150 + Math.floor(Math.random() * 120),
    year: 2016 + (i % 9),
    icon: ARTIST_ICONS[i % ARTIST_ICONS.length],
    popularity: 30 + Math.floor(Math.random() * 70),
    features: randFeatures(),
  }));
}

let SONGS_DB = seedSongs();
