# MVP Polishing: Testing - TMDB & Integration

**Goal:** Test TMDB API integration and end-to-end workflows

**Status:** ✅ TMDB unit tests complete (20 tests passing), integration tests deferred

---

## Test File: `tests/tmdb.test.js`

### URL Generation (Pure Methods)
- [x] `getPosterUrl()` - Default size (w342)
- [x] `getPosterUrl()` - Custom size
- [x] `getPosterUrl()` - Null path returns null
- [x] `getPosterUrl()` - Empty string returns null
- [x] `getBackdropUrl()` - Default size (w780)
- [x] `getBackdropUrl()` - Custom size
- [x] `getBackdropUrl()` - Null path returns null
- [x] `getOriginalPosterUrl()` - Original size
- [x] `getOriginalPosterUrl()` - Null path returns null
- [x] `getOriginalBackdropUrl()` - Original size
- [x] `getOriginalBackdropUrl()` - Null path returns null

### API Key Management
- [x] `setApiKey()` - Updates key
- [x] `setApiKey()` - Allows empty string
- [x] Constructor - Sets API key
- [x] Constructor - Sets base URLs
- [x] Constructor - Creates Soup session

### Validation (No Network)
- [x] `searchMovies()` - Throws without API key
- [x] `searchMovies()` - Throws with null API key
- [x] `getMovieDetails()` - Throws without API key
- [x] `testConnection()` - Throws without API key

### Not Tested (Require Network)
- [ ] `searchMovies()` - Returns results
- [ ] `searchMovies()` - Handles empty results
- [ ] `getMovieDetails()` - Returns movie data
- [ ] `getMovieDetails()` - Handles 404
- [ ] Network timeout handling
- [ ] Rate limiting (429 response)
- [ ] Invalid API key (401 response)

---

## Integration Tests

Deferred -- would require mocking the full search-to-log UI workflow. Manual testing checklist below covers these scenarios.

## Manual Testing Checklist

### Core Functionality
- [ ] Search returns relevant results
- [ ] Can log movie from search
- [ ] Can edit existing log
- [ ] Can delete log
- [ ] Log view shows all logged movies
- [ ] Sorting works (date, rating, title)
- [ ] Data persists after restart

### Edge Cases
- [ ] Log same movie twice (should edit)
- [ ] Delete all logs (empty state)
- [ ] Very long movie titles display correctly
- [ ] Special characters in notes work
- [ ] Missing poster handling

---

## Testing Approach

GJS-native tests using `gjs -m`. Pure/synchronous methods tested directly. Network-dependent methods tested only for input validation (API key checks).

Run: `gjs -m tests/tmdb.test.js`
