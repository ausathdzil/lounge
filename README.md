# Lounge

A personal movie tracker for GNOME. Search for movies, rate them, and keep a log of everything you have watched.

Built with GTK4, libadwaita, and GJS.

## Features

- **Search** movies using The Movie Database (TMDB)
- **View details** including poster, overview, runtime, genres, and director
- **Log** movies with a 5-star rating, watch date, and personal notes
- **Browse** and sort your log by date, rating, or title
- **Edit** or delete existing log entries
- **Offline access** with local SQLite database and poster caching

## Requirements

- GNOME 48+ runtime
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)

## Building

### GNOME Builder (Recommended)

1. Clone the repository
2. Open the project in [GNOME Builder](https://apps.gnome.org/Builder/)
3. Press the Run button

### Manual Flatpak Build

```bash
flatpak-builder --user --install --force-clean build-dir io.github.ausathdzil.lounge.json
flatpak run io.github.ausathdzil.lounge
```

## Running Tests

```bash
gjs -m tests/database.test.js
gjs -m tests/tmdb.test.js
```

## Setup

On first launch, open Preferences and enter your TMDB API key. You can get a free key at [themoviedb.org](https://www.themoviedb.org/settings/api).

## License

Lounge is licensed under the [GNU General Public License v3.0 or later](COPYING).
