# Lounge - Personal Movie Tracker

A native GTK4 app built with GJS for tracking your movie-watching journey.

---

## Tech Stack

| Component        | Technology                     |
| ---------------- | ------------------------------ |
| UI Framework     | GTK4 + libadwaita              |
| Language         | JavaScript (GJS)               |
| Database         | SQLite (via GDA or custom)     |
| Movie Metadata   | TMDB API                       |
| Build System     | Meson                          |
| Packaging        | Flatpak                        |

---

## Features

### Core Features
- **Log watched movies** - Track movies with date watched
- **Rate movies** - 5-star rating system (half-stars supported)
- **Write reviews/notes** - Personal notes for each movie
- **Watchlist** - Queue of movies to watch
- **Search movies** - Search and add from TMDB
- **Collections/lists** - Create custom lists

---

## Database Schema

```sql
-- Movies table (cached from TMDB)
CREATE TABLE movies (
    id INTEGER PRIMARY KEY,           -- TMDB ID
    title TEXT NOT NULL,
    original_title TEXT,
    year INTEGER,
    poster_path TEXT,
    backdrop_path TEXT,
    overview TEXT,
    runtime INTEGER,                  -- minutes
    genres TEXT,                      -- JSON array
    director TEXT,
    tmdb_rating REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User's movie entries (diary)
CREATE TABLE diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    watched_date DATE,
    rating REAL,                      -- 0.5 to 5.0
    review TEXT,
    is_rewatch BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Watchlist
CREATE TABLE watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Custom collections/lists
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_movie_id INTEGER,           -- Movie to use as cover image
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collection items (many-to-many)
CREATE TABLE collection_items (
    collection_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,       -- For ordering
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, movie_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Indexes for performance
CREATE INDEX idx_diary_movie ON diary(movie_id);
CREATE INDEX idx_diary_date ON diary(watched_date);
CREATE INDEX idx_watchlist_movie ON watchlist(movie_id);
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);
```

---

## Project Structure

```
lounge/
├── data/
│   ├── icons/
│   │   └── hicolor/
│   │       ├── scalable/apps/
│   │       │   └── com.lounge.Lounge.svg
│   │       └── symbolic/apps/
│   │           └── com.lounge.Lounge-symbolic.svg
│   ├── ui/
│   │   ├── window.ui                 # Main window layout
│   │   ├── movie-card.ui             # Movie card component
│   │   ├── movie-details.ui          # Movie details dialog
│   │   ├── search-view.ui            # Search view
│   │   ├── diary-view.ui             # Diary/log view
│   │   ├── watchlist-view.ui         # Watchlist view
│   │   ├── collections-view.ui       # Collections view
│   │   └── preferences.ui            # Preferences dialog
│   ├── com.lounge.Lounge.desktop.in
│   ├── com.lounge.Lounge.metainfo.xml.in
│   ├── com.lounge.Lounge.gschema.xml
│   └── meson.build
├── src/
│   ├── main.js                       # Entry point
│   ├── application.js                # GtkApplication subclass
│   ├── window.js                     # Main window
│   ├── preferences.js                # Preferences dialog
│   ├── services/
│   │   ├── database.js               # SQLite wrapper
│   │   ├── tmdb.js                   # TMDB API client
│   │   └── settings.js               # GSettings wrapper
│   ├── models/
│   │   ├── movie.js                  # Movie model
│   │   ├── diary-entry.js            # Diary entry model
│   │   ├── watchlist-item.js         # Watchlist item model
│   │   └── collection.js             # Collection model
│   ├── views/
│   │   ├── search-view.js            # Search & add movies
│   │   ├── diary-view.js             # View watched movies
│   │   ├── watchlist-view.js         # View watchlist
│   │   └── collections-view.js       # Manage collections
│   ├── widgets/
│   │   ├── movie-card.js             # Movie poster card
│   │   ├── movie-details.js          # Movie details dialog
│   │   ├── rating-widget.js          # Star rating widget
│   │   ├── movie-grid.js             # Grid of movie cards
│   │   └── search-bar.js             # Search input with debounce
│   └── meson.build
├── build-aux/
│   └── flatpak/
│       └── com.lounge.Lounge.json    # Flatpak manifest
├── po/                               # Translations (future)
│   └── POTFILES.in
├── meson.build                       # Root build file
├── com.lounge.Lounge.in              # Launch script template
└── README.md
```

---

## UI/UX Design

### Navigation (Sidebar or AdwViewSwitcher)
1. **Search** - Find and add movies from TMDB
2. **Diary** - Chronological log of watched movies
3. **Watchlist** - Movies you want to watch
4. **Collections** - Custom lists

### Main Views

#### Search View
- Search bar at top with debounced input
- Grid of movie results (poster + title + year)
- Click movie to open details dialog
- Actions: Add to Watchlist, Log as Watched

#### Diary View
- Filter by year/month
- Sort by date watched, rating, title
- Grid or list view toggle
- Movie cards show: poster, title, rating, date

#### Watchlist View
- Grid of movies to watch
- Drag to reorder (priority)
- Quick action: Mark as watched
- Remove from watchlist

#### Movie Details Dialog
- Large poster/backdrop
- Title, year, runtime, genres
- TMDB rating + your rating
- Overview/synopsis
- Your review/notes (editable)
- Watch history (if logged multiple times)
- Actions: Log watch, Add to collection, Add to watchlist

#### Collections View
- Grid of collection cards
- Create new collection button
- Click collection to see its movies
- Add/remove movies from collections

### UI Components (libadwaita)
- `AdwApplicationWindow` - Main window
- `AdwNavigationSplitView` - Sidebar navigation
- `AdwHeaderBar` - App header with actions
- `AdwPreferencesWindow` - Settings
- `AdwDialog` - Movie details
- `AdwToast` - Notifications
- `AdwSpinner` - Loading states
- `GtkFlowBox` - Movie grids

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup with Meson
- [ ] Basic application skeleton
- [ ] Main window with navigation
- [ ] SQLite database setup and migrations
- [ ] Settings (GSettings) for TMDB API key

### Phase 2: TMDB Integration (Week 1-2)
- [ ] TMDB API client (search, details, images)
- [ ] Movie search view
- [ ] Movie details dialog
- [ ] Image caching (poster/backdrop)

### Phase 3: Core Features (Week 2-3)
- [ ] Log movie as watched
- [ ] Rating widget (5 stars, half-stars)
- [ ] Review/notes editor
- [ ] Diary view with filtering/sorting

### Phase 4: Watchlist (Week 3)
- [ ] Add to watchlist
- [ ] Watchlist view
- [ ] Mark as watched (move to diary)
- [ ] Priority ordering

### Phase 5: Collections (Week 3-4)
- [ ] Create/edit/delete collections
- [ ] Add/remove movies from collections
- [ ] Collection detail view

### Phase 6: Polish (Week 4)
- [ ] Empty states
- [ ] Error handling and offline support
- [ ] Loading states and skeletons
- [ ] Keyboard shortcuts
- [ ] Flatpak packaging

---

## Key Implementation Details

### TMDB API
```javascript
// Base URL: https://api.themoviedb.org/3
// Image base: https://image.tmdb.org/t/p/

// Endpoints needed:
// GET /search/movie?query={query}&page={page}
// GET /movie/{id}
// GET /movie/{id}/credits (for director)

// Image sizes:
// Posters: w154, w342, w500, original
// Backdrops: w780, w1280, original
```

### Database Access with GDA
```javascript
import Gda from 'gi://Gda';

// Or use Gio.File + custom SQL parser for simpler approach
```

### Image Caching
- Store images in `~/.cache/lounge/posters/` and `~/.cache/lounge/backdrops/`
- Use TMDB movie ID as filename
- Load from cache first, fetch if missing

### Async Patterns
```javascript
// Use Gio.Task or Promise wrappers for async operations
// Debounce search input (300ms)
// Show loading spinners during API calls
```

---

## GSettings Schema

```xml
<schemalist>
  <schema id="com.lounge.Lounge" path="/com/lounge/Lounge/">
    <key name="tmdb-api-key" type="s">
      <default>''</default>
      <summary>TMDB API Key</summary>
    </key>
    <key name="window-width" type="i">
      <default>1200</default>
    </key>
    <key name="window-height" type="i">
      <default>800</default>
    </key>
    <key name="window-maximized" type="b">
      <default>false</default>
    </key>
    <key name="default-view" type="s">
      <default>'diary'</default>
      <summary>Default view on startup</summary>
    </key>
  </schema>
</schemalist>
```

---

## Flatpak Permissions

```json
{
  "finish-args": [
    "--share=ipc",
    "--share=network",           // For TMDB API
    "--socket=fallback-x11",
    "--socket=wayland",
    "--device=dri",
    "--filesystem=xdg-cache/lounge:create"  // Image cache
  ]
}
```

---

## Future Enhancements (Post-MVP)
- Statistics view (movies per year, favorite genres, etc.)
- Import/export (CSV, Letterboxd export)
- Backup/restore database
- TV show support
- Multiple profiles
- Dark/light theme toggle (follows system by default)
- Search within your library

---

## Resources

- [GJS Documentation](https://gjs.guide/)
- [GTK4 Documentation](https://docs.gtk.org/gtk4/)
- [libadwaita Documentation](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/)
- [TMDB API Documentation](https://developers.themoviedb.org/3)
- [GNOME Human Interface Guidelines](https://developer.gnome.org/hig/)
- [Workbench](https://apps.gnome.org/Workbench/) - For prototyping UI
