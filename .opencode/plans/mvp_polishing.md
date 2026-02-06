# MVP Release Plan: Lounge Movie Tracker

## Overview
Minimum Viable Product (MVP) focusing on core functionality: **Search movies and log your watches**. All other features deferred to post-MVP releases.

## MVP Scope (Current Release)

### ✅ Completed Features

#### Phase 1: Foundation ✅
- Main window with adaptive navigation
- Search, Log, Watchlist, Collections views (UI only)
- Settings/preferences dialog
- Window state persistence
- Custom CSS styling

#### Phase 2: TMDB Integration ✅
- TMDB API service with caching
- Real-time movie search
- Movie poster loading and caching
- Movie details dialog with full info
- Error handling for API failures

#### Phase 3: Database Foundation ✅
- SQLite database for local storage
- Movie caching table
- Image cache service for posters
- Database migration system (v1 → v2)

#### Phase 4: Movie Logging ✅
- Database schema for logs (v2)
- Interactive 5-star rating widget
- Log entry dialog with validation
- Movie logging with rating, date, notes
- Log view with grid display
- Log entry cards with posters
- Sorting by date, rating, title
- Edit existing logs
- Delete logs with confirmation
- One log per movie (unique constraint)

### 🔄 Polishing Phase (Next)

#### UI/UX Improvements
- [ ] Empty state for Log view (when no movies logged)
- [ ] Loading indicators for async operations
- [ ] Better error messages and user feedback
- [ ] Keyboard navigation support
- [ ] Accessibility improvements (ARIA labels, contrast)
- [ ] Responsive layout refinements
- [ ] Animation and transitions
- [ ] Dark mode support (if not already working)

#### Code Quality
- [x] Unit tests for database methods (29 tests)
- [x] Unit tests for TMDB service (20 tests)
- [x] Test runner infrastructure (tests/runner.js)
- [x] Meson test targets
- [x] Bug fix: _getSchemaVersion() JSON parsing
- [ ] Error handling audit
- [ ] Code documentation
- [ ] Performance optimization
- [ ] Memory leak checks

#### Bug Fixes
- [ ] Test all edge cases
- [ ] Validate all user inputs
- [ ] Handle network failures gracefully
- [ ] Database corruption recovery
- [ ] Image loading failures

#### Release Preparation
- [x] App metadata (metainfo.xml)
- [x] Desktop file
- [x] README with installation instructions
- [x] LICENSE file (COPYING)
- [x] Version bump to 1.0.0
- [ ] App icon and branding
- [ ] CHANGELOG
- [ ] Flatpak manifest validation
- [ ] Flathub submission

### ⏸️ Post-MVP Features (Future Releases)

#### Phase 5: Watchlist (v1.1)
- Add "Want to Watch" functionality
- Separate view for watchlist
- Quick add from search results
- Move from watchlist to log

#### Phase 6: Collections (v1.2)
- Create custom movie collections
- Add movies to multiple collections
- Collection management UI
- Collection view with posters

#### Phase 7: Statistics (v1.3)
- View watching statistics
- Movies per year graph
- Rating distribution
- Total movies watched
- Most watched genres
- Average rating given

#### Phase 8: Import/Export (v1.4)
- Export data to JSON/CSV
- Import from other apps
- Backup and restore

#### Phase 9: Advanced Features (v2.0)
- Rewatches tracking
- Custom tags
- Advanced filters
- List view toggle
- Search within logs
- Bulk operations

## Current Status

**MVP Core Features: 100% Complete** ✅
- Search: ✅ Working
- Log: ✅ Working
- Database: ✅ Working
- UI: ✅ Functional

**Next: Polishing Phase**
Focus on stability, testing, and release preparation.

## Release Timeline

### v1.0.0 (MVP)
- **Status**: Core features complete
- **Next**: Polishing phase
- **Target**: After polishing complete

### v1.1.0 (Watchlist)
- **Status**: Planned
- **Timeline**: Post-MVP

### v1.2.0 (Collections)
- **Status**: Planned
- **Timeline**: After watchlist

### v1.3.0+ (Statistics, Import/Export)
- **Status**: Planned
- **Timeline**: Future releases

## Files to Polish

### Services
- `src/services/database.js` - Add tests, error handling
- `src/services/tmdb.js` - Add tests, rate limiting
- `src/services/image-cache.js` - Error handling, cleanup

### Views
- `src/views/search-view.js` - Loading states, error UI
- `src/views/log-view.js` - Empty state, refresh animation

### Widgets
- `src/widgets/movie-card.js` - Loading placeholder
- `src/widgets/movie-details-dialog.js` - Better error messages
- `src/widgets/log-entry-dialog.js` - Form validation UX
- `src/widgets/log-entry-card.js` - Loading states
- `src/widgets/rating-widget.js` - Accessibility

### Main
- `src/window.js` - Navigation improvements
- `src/main.js` - Startup error handling

### Tests
- `tests/database.test.js` - Unit tests
- `tests/tmdb.test.js` - Unit tests
- `tests/integration.test.js` - Integration tests

## Testing Checklist for Release

### Functionality
- [ ] Search movies by title
- [ ] View movie details
- [ ] Log movie with rating
- [ ] Log movie with date
- [ ] Log movie with notes
- [ ] Edit existing log
- [ ] Delete log
- [ ] View all logs
- [ ] Sort logs
- [ ] Click log to view details
- [ ] Data persists after restart

### Edge Cases
- [ ] Search with no results
- [ ] Log same movie twice (should edit)
- [ ] Delete all logs (empty state)
- [ ] Network offline
- [ ] Invalid API key
- [ ] Very long movie titles
- [ ] Special characters in notes
- [ ] Future date validation
- [ ] Missing poster

### UI/UX
- [ ] Responsive layout
- [ ] Loading indicators
- [ ] Error messages
- [ ] Keyboard navigation
- [ ] High contrast mode
- [ ] Large text mode

## Notes

- **MVP Goal**: Ship working search + log functionality
- **Polish Goal**: Stable, tested, user-ready release
- **Post-MVP**: Add features based on user feedback
- **No feature creep**: Stick to MVP scope until v1.0.0 ships

## Updated Plan Files

- `lounge_movie_tracker.md` - Master roadmap (updated)
- `phase_1_foundation.md` - ✅ Complete
- `phase_2_database_tmdb.md` - ✅ Complete
- `phase_3_tmdb_database.md` - ✅ Complete
- `phase_4_movie_logging.md` - ✅ Complete
- `mvp_polishing.md` - 🔄 New (this file)
