# MVP Polishing: Testing - Database

**Goal:** Unit tests for database operations

**Status:** 🔄 Not Started

---

## Test File: `tests/database.test.js`

### Database Initialization
- [ ] Test database creation on first run
- [ ] Test migration from v1 to v2
- [ ] Test database path resolution
- [ ] Test multiple app instances (concurrency)

### Movie Operations
- [ ] `cacheMovie()` - Insert new movie
- [ ] `cacheMovie()` - Update existing movie
- [ ] `getMovie()` - Retrieve by TMDB ID
- [ ] `getMovie()` - Non-existent movie returns null

### Logging Operations
- [ ] `logMovie()` - Create new log entry
- [ ] `logMovie()` - Update existing log (UPSERT)
- [ ] `logMovie()` - Validate rating constraints (1-5)
- [ ] `getLogEntry()` - Retrieve by movie ID
- [ ] `getMovieLogs()` - Get all logs sorted
- [ ] `deleteLogEntry()` - Remove log entry
- [ ] `isMovieLogged()` - Check if movie has log

### Error Handling
- [ ] Test SQL injection prevention
- [ ] Test corrupted database handling
- [ ] Test disk full scenarios
- [ ] Test permission errors

---

## Testing Approach

Use Node.js with a test runner like Jest or Mocha since database.js uses standard JavaScript patterns that can be tested outside GJS.

Key mocking needs:
- Gio.File (mock filesystem)
- Gio.Subprocess (mock SQLite execution)
- GLib (mock paths, environment)
