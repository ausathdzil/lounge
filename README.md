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

- GNOME 50+ runtime
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)

## Building

### GNOME Builder (Recommended for Development)

1. Clone the repository
2. Open the project in [GNOME Builder](https://apps.gnome.org/Builder/)
3. Press the Run button

### Manual Flatpak Build (Development)

```bash
flatpak-builder --user --install --force-clean build-dir io.github.ausathdzil.lounge.json
flatpak run io.github.ausathdzil.lounge
```

### Local Production Build (Export to Bundle)

To build a standalone `.flatpak` bundle that you can install or share without publishing to a repository:

```bash
# 1. Build the flatpak repository locally
flatpak-builder --repo=repo --force-clean build-dir io.github.ausathdzil.lounge.json

# 2. Export the bundle to a .flatpak file
flatpak build-bundle repo lounge.flatpak io.github.ausathdzil.lounge

# 3. Install the bundle (user-wide)
flatpak install --user lounge.flatpak
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
