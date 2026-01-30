# Phase 3: Database & TMDB Integration

**Goal:** Set up SQLite database and integrate TMDB API to replace mock data with real movie information.

---

## Overview

Phase 3 transitions from UI prototypes with mock data to a fully functional search experience powered by TMDB's movie database. This phase establishes the data layer that will support all future features.

### Key Objectives
1. ✅ Set up persistent SQLite database
2. ✅ Create TMDB API client for search and movie details
3. ✅ Build preferences dialog for API key management
4. ✅ Implement image downloading and caching
5. ✅ Wire up search view to use real TMDB data
6. ✅ Replace mock data throughout the app

---

## Database Architecture

### Implementation Approach
Use **Gio.Subprocess** to execute SQLite commands directly rather than GDA (simpler, more reliable in GJS).

### Database Location
`~/.local/share/lounge/lounge.db`

### Schema (from general plan)

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

-- User's movie entries (diary) - Not used in Phase 3
-- Watchlist - Not used in Phase 3
-- Collections - Not used in Phase 3

-- Settings/metadata table
CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);

INSERT INTO app_metadata (key, value) VALUES ('schema_version', '1');
```

### Database Service (`src/services/database.js`)

```javascript
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export class DatabaseService {
    constructor() {
        this._dbPath = null;
        this._initialized = false;
    }

    async initialize() {
        // Create data directory if needed
        // Initialize database with schema
        // Run migrations if needed
    }

    async query(sql, params = []) {
        // Execute SQL via subprocess
        // Return parsed results
    }

    async cacheMovie(movieData) {
        // Insert or update movie in cache
    }

    async getMovie(tmdbId) {
        // Get cached movie by TMDB ID
    }
}
```

---

## TMDB API Integration

### API Key Setup

Users need to obtain a free API key from TMDB:
1. Sign up at https://www.themoviedb.org/
2. Go to Settings → API → Request API Key
3. Choose "Developer" option
4. Fill in application details
5. Copy the API Key (v3 auth)

### TMDB Service (`src/services/tmdb.js`)

```javascript
import Soup from 'gi://Soup';

export class TMDBService {
    constructor(apiKey) {
        this._apiKey = apiKey;
        this._baseUrl = 'https://api.themoviedb.org/3';
        this._imageBaseUrl = 'https://image.tmdb.org/t/p/';
        this._session = new Soup.Session();
    }

    async searchMovies(query, page = 1) {
        // GET /search/movie?query={query}&page={page}
        // Return array of movie results
    }

    async getMovieDetails(movieId) {
        // GET /movie/{id}
        // Return detailed movie info
    }

    async getMovieCredits(movieId) {
        // GET /movie/{id}/credits
        // Extract director name
    }

    getPosterUrl(posterPath, size = 'w342') {
        // Build full poster URL
    }

    getBackdropUrl(backdropPath, size = 'w780') {
        // Build full backdrop URL
    }
}
```

### API Endpoints Used

| Endpoint | Purpose | Response Fields |
|----------|---------|-----------------|
| `GET /search/movie` | Search for movies | `results[]` with id, title, release_date, poster_path, overview |
| `GET /movie/{id}` | Get movie details | title, release_date, runtime, genres, overview, poster_path, vote_average |
| `GET /movie/{id}/credits` | Get cast/crew | `crew[]` to find director |

### Error Handling
- Invalid API key → Show error, prompt for valid key
- Network error → Show toast, allow retry
- Rate limiting → Respect TMDB limits (40 requests/10 seconds)
- Empty results → Show "No results found" state

---

## Image Caching

### Cache Directory Structure
```
~/.cache/lounge/
├── posters/
│   ├── 550.jpg          # Fight Club (TMDB ID 550)
│   ├── 13.jpg           # Forrest Gump
│   └── ...
└── backdrops/
    ├── 550.jpg
    └── ...
```

### Image Service (`src/services/image-cache.js`)

```javascript
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';

export class ImageCacheService {
    constructor() {
        this._cacheDir = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            'lounge'
        ]);
        this._ensureCacheDir();
    }

    async getPosterImage(movieId, posterPath, tmdbService) {
        // Check cache first
        // If not cached, download from TMDB
        // Save to cache
        // Return GdkPixbuf or file path
    }

    async downloadImage(url, localPath) {
        // Download using Soup.Session
        // Save to file
    }

    getCachedImagePath(type, movieId) {
        // Return path like ~/.cache/lounge/posters/550.jpg
    }
}
```

### Image Loading in MovieCard

Update `MovieCard` to load real images:
```javascript
// Instead of placeholder icon:
if (movie.poster_path) {
    const pixbuf = await imageCache.getPosterImage(
        movie.id,
        movie.poster_path,
        tmdbService
    );
    const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
    const picture = new Gtk.Picture({
        paintable: texture,
        content_fit: Gtk.ContentFit.COVER,
    });
} else {
    // Show placeholder
}
```

---

## Preferences Dialog

### UI Design (`src/widgets/preferences-dialog.js`)

Use `AdwPreferencesDialog` with a single page:

```
┌─────────────────────────────────────┐
│ Preferences                      ✕  │
├─────────────────────────────────────┤
│                                     │
│  TMDB Integration                   │
│  ┌─────────────────────────────┐   │
│  │ API Key                      │   │
│  │ ************************     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Get your free API key at:          │
│  https://www.themoviedb.org/        │
│                                     │
│  [Test Connection]                  │
│                                     │
└─────────────────────────────────────┘
```

### Features
- `AdwPasswordEntryRow` for API key (show/hide toggle)
- "Test Connection" button to validate API key
- Toast notification on success/failure
- Auto-save to GSettings on valid key

### GSettings Update

Add to `data/io.github.ausathdzil.lounge.gschema.xml`:

```xml
<key name="tmdb-api-key" type="s">
  <default>''</default>
  <summary>TMDB API Key</summary>
  <description>API key for accessing The Movie Database</description>
</key>
```

---

## Search View Updates

### Debounced Search

Replace disabled search entry with functional search:

```javascript
let searchTimeout = null;

searchEntry.connect('search-changed', () => {
    if (searchTimeout) {
        GLib.source_remove(searchTimeout);
    }
    
    searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
        const query = searchEntry.get_text();
        if (query.length >= 2) {
            this._performSearch(query);
        }
        searchTimeout = null;
        return GLib.SOURCE_REMOVE;
    });
});
```

### Loading States

Add spinner while searching:

```javascript
async _performSearch(query) {
    // Show loading state
    this._stack.set_visible_child_name('loading');
    
    try {
        const results = await tmdbService.searchMovies(query);
        this._displayResults(results);
    } catch (error) {
        this._showError(error);
    }
}
```

### Stack Children
- `empty` - Initial state with search icon
- `loading` - AdwSpinner while fetching
- `results` - Grid of movie cards
- `error` - Error state with retry button
- `no-results` - Empty search results state

---

## Implementation Steps

### Step 1: Database Setup ✅
1. Create `src/services/database.js`
2. Implement SQLite via Gio.Subprocess
3. Create schema initialization
4. Add database path to GSettings (for future backup/restore)
5. Initialize database on app startup in `main.js`

### Step 2: TMDB Service ✅
1. Create `src/services/tmdb.js`
2. Implement search endpoint
3. Implement movie details endpoint
4. Implement credits endpoint (for director)
5. Add error handling and rate limiting
6. Write unit tests for API responses

### Step 3: Preferences Dialog ✅
1. Create `src/widgets/preferences-dialog.js`
2. Design UI with AdwPreferencesDialog
3. Add API key entry field
4. Implement "Test Connection" validation
5. Wire up to GSettings
6. Add "Preferences" action to hamburger menu

### Step 4: Image Caching ✅
1. Create `src/services/image-cache.js`
2. Implement cache directory creation
3. Implement download logic with Soup
4. Add cache lookup before download
5. Handle download errors gracefully

### Step 5: Update MovieCard ✅
1. Accept both mock data and TMDB data
2. Add image loading logic
3. Show spinner while image loads
4. Fallback to placeholder on error
5. Handle missing poster_path gracefully

### Step 6: Wire Up Search View ✅
1. Enable search entry
2. Add debounced search handler
3. Show loading state during API call
4. Display results in grid
5. Update movie details dialog with real data
6. Cache searched movies in database

### Step 7: Remove Mock Data ✅
1. Remove `src/utils/mock-data.js` (or keep for dev/testing)
2. Show empty state when app starts
3. Encourage user to search for movies
4. Update Phase 2 placeholder states

---

## Testing Checklist

### Database
- [ ] Database file created in correct location
- [ ] Schema initialized properly
- [ ] Movies can be cached and retrieved
- [ ] Handles concurrent access gracefully

### TMDB API
- [ ] Valid API key allows searches
- [ ] Invalid API key shows error
- [ ] Search results return expected data
- [ ] Movie details fetch correctly
- [ ] Director extracted from credits
- [ ] Rate limiting is respected
- [ ] Network errors handled gracefully

### Preferences
- [ ] Preferences dialog opens from menu
- [ ] API key can be entered and saved
- [ ] "Test Connection" validates key
- [ ] Invalid key shows error toast
- [ ] Valid key shows success toast
- [ ] Settings persist across app restarts

### Image Caching
- [ ] Images download on first view
- [ ] Cached images load instantly
- [ ] Cache directory created automatically
- [ ] Handles missing poster_path
- [ ] Download errors show placeholder
- [ ] Cache survives app restarts

### Search Functionality
- [ ] Search debounces input (300ms)
- [ ] Loading spinner shows during search
- [ ] Results display in grid
- [ ] Empty query shows empty state
- [ ] No results shows appropriate message
- [ ] Clicking result opens details
- [ ] Details show real TMDB data

### UI/UX
- [ ] First launch prompts for API key
- [ ] Smooth transitions between states
- [ ] Keyboard navigation still works
- [ ] Images load progressively
- [ ] Error messages are user-friendly

---

## File Checklist

### New Files
- [ ] `src/services/database.js` - SQLite wrapper
- [ ] `src/services/tmdb.js` - TMDB API client
- [ ] `src/services/image-cache.js` - Image download/cache
- [ ] `src/widgets/preferences-dialog.js` - Settings UI

### Modified Files
- [ ] `src/main.js` - Initialize database on startup
- [ ] `src/window.js` - Add preferences action, pass services to views
- [ ] `src/views/search-view.js` - Wire up real search
- [ ] `src/widgets/movie-card.js` - Load real images
- [ ] `src/widgets/movie-details-dialog.js` - Show real data
- [ ] `data/io.github.ausathdzil.lounge.gschema.xml` - Add API key setting
- [ ] `src/io.github.ausathdzil.lounge.src.gresource.xml` - Register new files

### Dependencies to Check
- [ ] Soup-3.0 (for HTTP requests)
- [ ] GdkPixbuf-2.0 (for image handling)
- [ ] Verify in flatpak manifest

---

## Success Criteria

Phase 3 is complete when:

1. ✅ Users can enter TMDB API key in preferences
2. ✅ Search bar queries TMDB and shows real results
3. ✅ Movie cards display real poster images (cached)
4. ✅ Movie details show complete TMDB information
5. ✅ All searched movies cached in local database
6. ✅ App handles network errors gracefully
7. ✅ Images load smoothly with placeholders
8. ✅ No references to mock data remain (unless kept for testing)

---

## Notes

### API Key Security
- Store in GSettings (user-only readable)
- Never commit API keys to git
- Consider adding `.env` support for development

### Performance Considerations
- Debounce search to avoid excessive API calls
- Cache aggressively to reduce network usage
- Load images asynchronously to avoid blocking UI
- Consider pagination for search results (future)

### Future Enhancements (Post-Phase 3)
- Infinite scroll for search results
- Advanced search filters (year, genre)
- Trending/popular movies on empty search
- Offline mode with cached data
- Image quality selection (w154/w342/w500)

---

## Commit Strategy

Similar to Phase 2, use multiple commits if needed:

1. `feat: add database service with sqlite support`
2. `feat: implement tmdb api client`
3. `feat: add preferences dialog for api key`
4. `feat: implement image caching service`
5. `feat: wire up search with tmdb api`
6. `refactor: replace mock data with tmdb integration`

Or one comprehensive commit:
`feat: integrate tmdb api and database (phase 3)`

---

## Dependencies

### GJS Imports Required
```javascript
import Soup from 'gi://Soup?version=3.0';
import GdkPixbuf from 'gi://GdkPixbuf';
```

### Flatpak Manifest Updates
```json
{
  "modules": [
    {
      "name": "libsoup3",
      "buildsystem": "meson",
      ...
    }
  ],
  "finish-args": [
    "--share=network",  // Required for TMDB API
    "--filesystem=xdg-cache/lounge:create"  // Required for image cache
  ]
}
```
