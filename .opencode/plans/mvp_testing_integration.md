# MVP Polishing: Testing - TMDB & Integration

**Goal:** Test TMDB API integration and end-to-end workflows

**Status:** 🔄 Not Started

---

## Test File: `tests/tmdb.test.js`

### API Client
- [ ] `searchMovies()` - Returns results
- [ ] `searchMovies()` - Handles empty results
- [ ] `getMovieDetails()` - Returns movie data
- [ ] `getMovieDetails()` - Handles 404
- [ ] `getPosterUrl()` - Generates correct URLs
- [ ] API key validation

### Error Handling
- [ ] Network timeout handling
- [ ] Rate limiting (429 response)
- [ ] Invalid API key (401 response)
- [ ] Malformed JSON responses
- [ ] No internet connection

---

## Test File: `tests/integration.test.js`

### End-to-End Workflows

**Search and Log Flow:**
1. Search for "The Matrix"
2. Select movie from results
3. Log with rating 5, today's date
4. Verify appears in Log view
5. Edit rating to 4
6. Verify updated
7. Delete log
8. Verify removed

**Data Persistence:**
1. Log several movies
2. Close app
3. Reopen app
4. Verify all logs still present
5. Verify sorting works

---

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
- [ ] Future date validation
- [ ] Missing poster handling

---

## Test Infrastructure Needed

- Mock TMDB API server (or use nock/vitest-fetch-mock)
- Test database (in-memory or temp file)
- GitHub Actions CI for automated testing
- Code coverage reporting (optional)
